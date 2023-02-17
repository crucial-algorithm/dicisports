import { useTranslation } from 'react-i18next';
import { Form, useActionData } from '@remix-run/react';

import type { ActionFunction, LoaderFunction, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';

import { z } from 'zod';

import Main from '~/components/shared/Main';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import InputError from '~/components/shared/form/InputError';
import Button, { ButtonLink } from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';

import i18n from '~/server/i18n.server';

import { findUserByEmail } from '~/server/db/users.server';
import {
  getUser,
  sendRecoverPasswordToken
} from '~/server/auth/session.server';
import { getDomainUrl } from '~/utils/misc';
import { CanonicalMeta } from '~/utils/seo';

export const handle = {
  i18n: ['recover-password']
};

type ActionData = {
  fields: {
    email: string
  },
  errors: {
    email?: string
    submit?: string
  },
  successMessage: string | null
}

export const meta: MetaFunction = CanonicalMeta;

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);

  if (user) {
    return redirect('/');
  }
  return null;
};

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, ['recover-password']);
  const params = new URLSearchParams(await request.text());
  const email = params.get('email') as string;

  try {
    z.string().email().parse(email);
  } catch (e) {
    return json({
      errors: { email: t('Invalid Email') },
      fields: { email }
    });
  }

  if (await findUserByEmail(email)) {
    const domainUrl = getDomainUrl(request);

    await sendRecoverPasswordToken({ emailAddress: email, domainUrl });
  }

  // don't give any info about existing accounts, so we return success even if user doesn't exist
  return json({
    errors: { },
    fields: { email },
    successMessage: t('A magic link has been sent to you')
  });

};

export default function Recover() {
  const { t } = useTranslation('recover-password');
  const { errors, fields, successMessage } = (useActionData<ActionData>() as ActionData) || {
    errors: { email: '', submit: '' },
    fields: { email: '' }
  };

  return (
    <Main className="w-5/6 m-auto md:w-144">
      <Form method="post" autoComplete="off">
        <FormField label={t('Email')} error={errors.email}>
          <TextField
            name="email"
            className="w-full text-sm h-14 md:text-2xl md:h-20"
            autoComplete="off"
            defaultValue={fields.email}
          />
        </FormField>
        <ButtonGroup>
          <ButtonLink variant="secondary" to="/login" className="hidden md:inline-flex">
            {t('Cancel')}
          </ButtonLink>
          <Button>{t('Email Recover Link')}</Button>
        </ButtonGroup>
        {errors.submit && (
          <InputError className="mt-4" id="error-message">
            {errors.submit}
          </InputError>
        )}
        {successMessage && (
          <p
            id="success-message"
            className="dark:text-blueGray-500 text-gray-500 text-lg mt-2"
          >
            <span role="img" aria-label="sparkles">
              ✨
            </span>{' '}
            {successMessage}
          </p>
        )}
      </Form>
    </Main>
  );
}
