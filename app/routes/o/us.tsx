import * as React from 'react';
import type {
  ActionFunction,
  LoaderFunction,
  UploadHandler
} from '@remix-run/node';
import {
  json,
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from '@remix-run/node';

import { Link, useActionData, useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import { z, ZodError } from 'zod';

import FormField from '~/components/shared/form/FormField';
import Main from '~/components/shared/Main';
import TextField from '~/components/shared/form/TextField';
import UploadImage from '~/components/shared/form/UploadImage';
import ButtonGroup from '~/components/shared/ButtonGroup';
import Button, { ButtonLink } from '~/components/shared/Button';
import { getUser, requireUser } from '~/server/auth/session.server';
import i18n from '~/server/i18n.server';
import { badRequest, getDomainUrl } from '~/utils/misc';
import {
  createOrganizer,
  findOrganizer,
  updateOrganizer
} from '~/server/db/organizer.server';
import type { Organizer, OrganizerInput } from '~/types';
import { H2, H4, Paragraph } from '~/components/shared/typography';
import { uploadImageToCloudinary } from '~/server/storage/cloudinary.server';
import UploadForm from '~/components/shared/form/UploadForm';
import Id from '~/server/utils/Id.server';
import InputError from '~/components/shared/form/InputError';
import { sendSubmitedOrganizerProfileConfirmation } from '~/server/email.server';

type ActionData = {
  errors?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    logo?: string;
    description?: string;
    terms?: string;
  };
};

type LoaderData = {
  organizer: Organizer;
};

export const handle = {
  i18n: ['organizer-form']
};

function processImageField(
  value: string | null | File,
  isUpdate: boolean,
  organizer: Organizer | null
) {
  if ((isUpdate && !value) || value instanceof File) {
    return organizer ? organizer.logo : '';
  }

  return value || '';
}

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'organizer-form');

  const user = await getUser(request);
  const organizer = await findOrganizer(user?.id as string);
  const isUpdate: boolean = !!organizer;

  const organizerId = organizer ? organizer.id : Id();

  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, data, filename }) => {
      if (!name.startsWith('/file/image') || !filename) {
        return undefined;
      }

      const uploadedImage = await uploadImageToCloudinary(
        data,
        organizerId || null
      );

      return uploadedImage.public_id;
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  const form = await unstable_parseMultipartFormData(request, uploadHandler);

  const logo = form.get('/file/image/0');
  const terms: boolean = (form.get('terms') as string) === 'on';

  const data: OrganizerInput = {
    id: organizerId,
    name: form.get('name') as string,
    email: form.get('email') as string,
    logo: processImageField(logo, isUpdate, organizer),
    phoneNumber:
      (form.get('phone-number') as string).length > 0
        ? parseInt(form.get('phone-number') as string)
        : null,
    address: form.get('address') as string,
    postalCode: form.get('postal-code') as string,
    city: form.get('city') as string,
    description: form.get('description') as string,
    userId: user?.id as string
  };

  const OrganizerSchema = z.object({
    name: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    email: z.string().email({ message: t('Valid E-mail') }),
    logo: z
      .string({
        required_error: t('Field Required'),
        invalid_type_error: t('Field Required')
      })
      .min(1, { message: t('Field Required') }),
    phoneNumber: z
      .number({
        invalid_type_error: t('Field Required')
      })
      .refine((val) => val.toString().length === 9, t('9 Digits'))
      .refine(
        (val) =>
          val.toString().startsWith('91') ||
          val.toString().startsWith('92') ||
          val.toString().startsWith('93') ||
          val.toString().startsWith('96'),
        t('Invalid number')
      )
      .nullable(),
    address: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    postalCode: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    city: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    description: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') })
  });

  try {
    OrganizerSchema.parse(data);

    if (isUpdate) {
      await updateOrganizer(data);
    } else {
      z.object({
        terms: z
          .boolean({ required_error: t('Accept Dici Terms') })
          .refine((v) => v, { message: t('Accept Dici Terms') })
      }).parse({ terms });

      const domainUrl = getDomainUrl(request);

      await createOrganizer(data);

      await sendSubmitedOrganizerProfileConfirmation({
        emailAddress: data.email,
        organizerName: data.email,
        domainUrl
      });
    }

    return json({});
  } catch (e) {
    if (!(e instanceof ZodError)) {
      console.error(e);
      return badRequest({
        error: 'We dont know what happened'
      });
    }

    const errors: { [key: string]: string | undefined } = {};

    for (const error of (e as ZodError).errors) {
      errors[error.path[0]] = error.message;
    }

    return badRequest({ errors });
  }
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);
  const organizer = await findOrganizer(user.id as string);

  return json({
    organizer
  });
};

export default function UsRoute() {
  const { t } = useTranslation('organizer-form');
  const { organizer } = useLoaderData<LoaderData>() as LoaderData;
  const actionData = useActionData<ActionData>() as ActionData;

  if (organizer && organizer.status === 'PENDING') {
    return <PendingOrganizerMessage />;
  }

  return (
    <Main>
      <UploadForm method="post">
        <div className="mb-12 lg:mb-20">
          <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
            <div>
              <H2>{t('Organizer Profile')}</H2>
              {(!organizer || organizer.status !== 'APPROVED') && (
                <H4 variant="secondary" as="p">
                  {t('Organizer Profile - Description')}
                </H4>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:grid md:grid-cols-2 md:grid-flow-col md:gap-4">
          <div>
            <FormField
              data-cy="name"
              label={t('Name')}
              error={actionData?.errors?.name}
              description={t('Organizer display field')}
            >
              <TextField name="name" defaultValue={organizer?.name || ''} />
            </FormField>

            <FormField
              data-cy="email"
              label={t('E-mail')}
              error={actionData?.errors?.email}
            >
              <TextField name="email" defaultValue={organizer?.email || ''} />
            </FormField>

            <FormField
              label={t('Phone Number')}
              error={actionData?.errors?.phoneNumber}
            >
              <TextField
                name="phone-number"
                type="number"
                placeholder={t('Phone Number Placeholder')}
                defaultValue={organizer?.phoneNumber || ''}
              />
            </FormField>

            <FormField
              data-cy="address"
              label={t('Address')}
              error={actionData?.errors?.address}
            >
              <TextField
                name="address"
                defaultValue={organizer?.address || ''}
              />
            </FormField>

            <div className="flex flex-col lg:flex-row lg:gap-x-2">
              <FormField
                data-cy="postal-code"
                label={t('Postal Code')}
                className="w-1/2 md:w-full"
                error={actionData?.errors?.postalCode}
              >
                <TextField
                  name="postal-code"
                  defaultValue={organizer?.postalCode || ''}
                />
              </FormField>

              <FormField
                data-cy="city"
                label={t('City')}
                className="w-1/2 md:w-full"
                error={actionData?.errors?.city}
              >
                <TextField name="city" defaultValue={organizer?.city || ''} />
              </FormField>
            </div>

            <FormField
              label={t('Description')}
              error={actionData?.errors?.description}
              description={t('Organizer display field')}
            >
              <div className="mt-1 relative rounded-md shadow-sm">
                <textarea
                  name="description"
                  className="input-text p-10"
                  placeholder={t('Profile Description')}
                  rows={5}
                  cols={50}
                  defaultValue={organizer?.description || ''}
                />
              </div>
            </FormField>
          </div>
          <div className="col-span-3">
            <FormField
              label={t('Profile Photo')}
              error={actionData?.errors?.logo}
              description={t('Organizer display field')}
            >
              <UploadImage
                index={0}
                label={t('Hint For Profile Picture')}
                defaultValue={organizer?.logo || ''}
              />
            </FormField>
          </div>
        </div>
        {!organizer && (
          <>
            <div className="flex items-center mb-8">
              <input
                name="terms"
                type="checkbox"
                className="w-4 h-4 text-indigo-500 bg-gray-100 rounded border-gray-300 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
              />
              <label
                className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                htmlFor="terms"
              >
                {t('Read and Accepted')}
                <Link target="_blank" to="/organizers-terms" data-cy="terms-link">
                  {t('Terms and Conditions')}
                </Link>
              </label>
            </div>

            <InputError id="terms-error" className="mb-2">
              {actionData?.errors?.terms}
            </InputError>
          </>
        )}

        <ButtonGroup>
          <ButtonLink
            type="button"
            variant="secondary"
            to={!organizer || organizer?.status === 'PENDING' ? '/' : '/o'}
          >
            {t('Cancel')}
          </ButtonLink>

          <Button type="submit" name="save-profile">
            {t('Save')}
          </Button>
        </ButtonGroup>
      </UploadForm>
    </Main>
  );
}

function PendingOrganizerMessage() {
  const { t } = useTranslation('organizer-form');

  return (
    <Main>
      <Paragraph data-cy="pending-validation">
        {t('Pending Validation')}
      </Paragraph>
      <a href="/">{t('Pending Validation Action')}</a>
    </Main>
  );
}
