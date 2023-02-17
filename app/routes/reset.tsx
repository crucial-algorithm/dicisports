import { useTranslation } from 'react-i18next';
import { Form, useActionData } from '@remix-run/react';

import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';

import { z, ZodError } from 'zod';

import Main from '~/components/shared/Main';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import InputError from '~/components/shared/form/InputError';
import Button, { ButtonLink } from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';

import i18n from '~/server/i18n.server';
import { getUser, requireUser } from '~/server/auth/session.server';
import { updateUserPassword } from '~/server/db/users.server';
import type { User } from '~/types';

export const handle = {
  i18n: ['reset-password']
};

type ActionData = {
  errors: {
    password?: string
    confirmation?: string
    submit?: string
  }
}

export const loader: LoaderFunction = async ({ request }) => {
  await requireUser(request);
  return null;
};

export const action: ActionFunction = async ({ request }) => {
  await requireUser(request);

  const t = await i18n.getFixedT(request, ['reset-password']);
  const params = new URLSearchParams(await request.text());
  const password = params.get('password') as string;
  const confirmation = params.get('confirmation') as string;
  const user = await getUser(request);

  const Schema = z
    .object({
      password: z
        .string()
        .min(6, t('Password min length')),
      confirmation: z
        .string()
        .min(6, t('Password min length'))
    })
    .refine((data) => data.password === data.confirmation, {
      message: t('Passwords Mismatch'),
      path: ['confirmation']
    });

  try {
    Schema.parse({ password, confirmation });
    await updateUserPassword({ id: (user as User).id, password });
    return redirect(`/me?message=${t('Password Changed')}`);

  } catch (e) {
    if (!(e instanceof ZodError)) {
      console.error(e);
      return json({
        errors: {
          submit: t('Error Updating Password')
        }
      });
    }

    const errors: { [key: string]: string | undefined } = {};

    for (const error of (e as ZodError).errors) {
      errors[error.path[0]] = error.message;
    }

    return json({ errors });
  }
};

export default function Reset() {
  const { t } = useTranslation('reset-password');
  const { errors } = (useActionData<ActionData>() as ActionData) || {
    errors: { email: '', submit: '' },
    fields: { email: '' },
    successMessage: ''
  };

  return (
    <Main className="w-5/6 m-auto md:w-144">
      <Form method="post" autoComplete="off">
        <FormField label={t('Password')} error={errors.password}>
          <TextField
            name="password"
            className="w-full text-sm h-14 md:text-2xl md:h-20"
            type="password"
            autoComplete="off"
          />
        </FormField>
        <FormField label={t('Confirm Password')} error={errors.confirmation}>
          <TextField
            name="confirmation"
            className="w-full text-sm h-14 md:text-2xl md:h-20"
            type="password"
            autoComplete="off"
          />
        </FormField>
        <ButtonGroup>
          <ButtonLink variant="secondary" to="/" className="hidden md:inline-flex">
            {t('Cancel')}
          </ButtonLink>
          <Button>{t('Change Password')}</Button>
        </ButtonGroup>
        {errors.submit && (
          <InputError className="mt-4" id="error-message">
            {errors.submit}
          </InputError>
        )}
      </Form>
    </Main>
  );
}
