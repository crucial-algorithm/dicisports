import * as React from 'react';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import {
  json,
  redirect,
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler, unstable_parseMultipartFormData,
  UploadHandler
} from '@remix-run/node';

import { Form, useActionData, useLoaderData } from '@remix-run/react';
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
import type { Organiser } from '~/types';
import { Paragraph } from '~/components/shared/typography';
import { processImgField } from '~/server/utils/misc';
import { uploadImageToCloudinary } from '~/server/storage/cloudinary.server';
import UploadForm from '~/components/shared/form/UploadForm';

type ActionData = {
  errors?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    postalCode?: string;
    city?: string;
  };
};

type LoaderData = {
  organiser: Organiser;
}

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'checkout');

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

  const data = {
    name: form.get('name'),
    email: form.get('email'),
    logo: processImgField(form.get('/file/image/0'), false),
    phoneNumber: parseInt(form.get('phone-number')),
    address: form.get('address'),
    postalCode: form.get('postal-code'),
    city: form.get('city'),
    description: (form.get('description') as string) || null,
    userId: user?.id
  };

  const OrganiserSchema = z.object({
    name: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    email: z.string().email({ message: t('Valid E-mail') }),
    phoneNumber: z
      .number({
        required_error: t('Field Required'),
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
      ),
    address: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    postalCode: z
      .string({ required_error: t('Field Required') })
      .min(2, { message: t('Min 2 Chars') }),
    city: z
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

  if ((organiser && organiser.status === 'APPROVED') || user.role === 'ORGANIZER') {
    return redirect('/o');
  }
  
  return json({
    organiser
  });
};

export default function UsRoute() {
  const { t } = useTranslation('organiser-form');
  const { organiser } = useLoaderData<LoaderData>() as LoaderData;
  const actionData = useActionData<ActionData>() as ActionData;

  if (organiser && organiser.status === 'PENDING') {
    return (
        <PendingOrganiserMessage />
    );
  }

  return (
    <Main>
      <UploadForm method="post">
        <div className="flex flex-row w-full">
          <FormField label={t('Profile Photo')} className="w-112">
            <UploadImage index={0} label={t('Hint For Profile Picture')} defaultValue={organiser?.logo || ''} />
          </FormField>

          <div className="flex flex-col ml-4">
            <FormField data-cy="name" label={t('Name')} error={actionData?.errors?.name}>
              <TextField name="name" defaultValue={organiser?.name || ''} />
            </FormField>

            <div className="flex lg:flex-row lg:gap-x-2">
              <FormField data-cy="email" label={t('E-mail')} className="w-1/2" error={actionData?.errors?.email} >
                <TextField name="email" defaultValue={organiser?.email || ''} />
              </FormField>

              <FormField label={t('Phone Number')} className="w-1/2" error={actionData?.errors?.phoneNumber} >
                <TextField
                  name="phone-number"
                  type="number"
                  placeholder={t('Phone Number Placeholder')}
                  defaultValue={organiser?.phoneNumber || ''}
                />
              </FormField>
            </div>
          </div>
        </div>

        <FormField data-cy="address" label={t('Address')} error={actionData?.errors?.address}>
          <TextField name="address"  defaultValue={organiser?.address || ''} />
        </FormField>

        <div className="flex lg:flex-row lg:gap-x-2">
          <FormField
            data-cy="postal-code"
            label={t('Postal Code')}
            className="w-1/4"
            error={actionData?.errors?.postalCode}
          >
            <TextField name="postal-code" defaultValue={organiser?.postalCode || ''} />
          </FormField>

          <FormField data-cy="city" label={t('City')} className="w-1/4" error={actionData?.errors?.city}>
            <TextField name="city" defaultValue={organiser?.city || ''} />
          </FormField>
        </div>

        <FormField label={t('Description')}>
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

        <ButtonGroup>
          <ButtonLink type="button" variant="secondary" to={'/'}>
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
        <Paragraph data-cy="pending-validation">{t('Pending Validation')}</Paragraph>
        <a href="/">{t('Pending Validation Action')}</a>
      </Main>
  );
}