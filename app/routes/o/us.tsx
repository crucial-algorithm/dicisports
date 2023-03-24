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

import { useActionData, useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import { z, ZodError } from 'zod';

import { inputBaseClasses } from '~/components/shared/form/InputBase';

import FormField from '~/components/shared/form/FormField';
import Main from '~/components/shared/Main';
import TextField from '~/components/shared/form/TextField';
import UploadImage from '~/components/shared/form/UploadImage';
import ButtonGroup from '~/components/shared/ButtonGroup';
import Button, { ButtonLink } from '~/components/shared/Button';
import { getUser, requireUser } from '~/server/auth/session.server';
import i18n from '~/server/i18n.server';
import { badRequest } from '~/utils/misc';
import { createOrganiser, findOrganiser } from '~/server/db/organiser.server';
import type { Organiser, OrganiserInput } from '~/types';
import { Paragraph } from '~/components/shared/typography';
import { uploadImageToCloudinary } from '~/server/storage/cloudinary.server';
import UploadForm from '~/components/shared/form/UploadForm';
import { processImgField } from '~/server/utils/misc';

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
  };
};

type LoaderData = {
  organiser: Organiser;
};

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'organiser-form');

  const user = await getUser(request);

  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, data, filename }) => {
      if (!name.startsWith('/file/image') || !filename) {
        return undefined;
      }
      const uploadedImage = await uploadImageToCloudinary(data);

      return uploadedImage.public_id;
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  const form = await unstable_parseMultipartFormData(request, uploadHandler);

  const isUpdate = user?.role === 'ORGANIZER';
  // @ts-ignore TODO: fix type
  const data: OrganiserInput = {
    name: form.get('name') as string,
    email: form.get('email') as string,
    logo: processImgField(form.get('/file/image/0') as string, isUpdate),
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

  const OrganiserSchema = z.object({
    name: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    email: z.string().email({ message: t('Valid E-mail') }),
    logo: z
      .string({ required_error: t('Field Required') })
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
    OrganiserSchema.parse(data);
    await createOrganiser(data);

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
  const organiser = await findOrganiser(user.id as string);

  return json({
    organiser
  });
};

export default function UsRoute() {
  const { t } = useTranslation('organiser-form');
  const { organiser } = useLoaderData<LoaderData>() as LoaderData;
  const actionData = useActionData<ActionData>() as ActionData;

  if (organiser && organiser.status === 'PENDING') {
    return <PendingOrganiserMessage />;
  }

  return (
    <Main>
      <UploadForm method="post">
        <div className="flex flex-col md:grid md:grid-cols-2 md:grid-flow-col md:gap-4">
          <div>
            <FormField
              data-cy="name"
              label={t('Name') + '*'}
              error={actionData?.errors?.name}
            >
              <TextField name="name" defaultValue={organiser?.name || ''} />
            </FormField>

            <div className="flex flex-col lg:flex-row lg:gap-x-2">
              <FormField
                data-cy="email"
                label={t('E-mail')}
                className="lg:w-1/2"
                error={actionData?.errors?.email}
              >
                <TextField name="email" defaultValue={organiser?.email || ''} />
              </FormField>

              <FormField
                label={t('Phone Number')}
                className="lg:w-1/2"
                error={actionData?.errors?.phoneNumber}
              >
                <TextField
                  name="phone-number"
                  type="number"
                  placeholder={t('Phone Number Placeholder')}
                  defaultValue={organiser?.phoneNumber || ''}
                />
              </FormField>
            </div>

            <FormField
              data-cy="address"
              label={t('Address')}
              error={actionData?.errors?.address}
            >
              <TextField
                name="address"
                defaultValue={organiser?.address || ''}
              />
            </FormField>

            <div className="flex flex-col lg:flex-row lg:gap-x-2">
              <FormField
                data-cy="postal-code"
                label={t('Postal Code')}
                className="lg:w-1/3"
                error={actionData?.errors?.postalCode}
              >
                <TextField
                  name="postal-code"
                  defaultValue={organiser?.postalCode || ''}
                />
              </FormField>

              <FormField
                data-cy="city"
                label={t('City')}
                className="lg:w-1/3"
                error={actionData?.errors?.city}
              >
                <TextField name="city" defaultValue={organiser?.city || ''} />
              </FormField>
            </div>

            <FormField
              label={t('Description') + '*'}
              error={actionData?.errors?.description}
            >
              <div className="mt-1 relative rounded-md shadow-sm">
                <textarea
                  name="description"
                  className={inputBaseClasses('p-10')}
                  placeholder={t('Profile Description')}
                  rows={5}
                  cols={50}
                  defaultValue={organiser?.description || ''}
                />
              </div>
            </FormField>
          </div>
          <div className="col-span-3">
            <FormField
              label={t('Profile Photo') + '*'}
              error={actionData?.errors?.logo}
            >
              <UploadImage
                index={0}
                label={t('Hint For Profile Picture')}
                defaultValue={organiser?.logo || ''}
              />
            </FormField>
          </div>
        </div>
        <legend className="block text-sm font-medium text-gray-500 mb-4">
          {t('Organiser display fields')}
        </legend>
        <ButtonGroup>
          <ButtonLink
            type="button"
            variant="secondary"
            to={!organiser || organiser?.status === 'PENDING' ? '/' : '/o'}
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

function PendingOrganiserMessage() {
  const { t } = useTranslation('organiser-form');

  return (
    <Main>
      <Paragraph data-cy="pending-validation">
        {t('Pending Validation')}
      </Paragraph>
      <a href="/">{t('Pending Validation Action')}</a>
    </Main>
  );
}
