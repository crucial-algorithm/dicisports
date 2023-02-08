import { Form, Link, useActionData, useSearchParams } from '@remix-run/react';
import type { ActionFunction, LoaderFunction, MetaFunction } from 'remix';
import { json, redirect } from 'remix';

import { z, ZodError } from 'zod';

import React from 'react';

import { useTranslation } from 'react-i18next';

import { getSession, getUser } from '~/server/auth/session.server';
import { getLoginInfoSession } from '~/server/auth/login.server';
import i18n from '~/server/i18n.server';
import { createUser, findUserByEmail } from '~/server/db/users.server';
import Button, { ButtonLink } from '~/components/shared/Button';

import ButtonGroup from '~/components/shared/ButtonGroup';
import Main from '~/components/shared/Main';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import { H2, H6 } from '~/components/shared/typography';
import { verifyEmailAddress } from '~/server/auth/verifier.server';
import { addGroupToFavorites } from '~/server/db/groups.server';
import InputError from '~/components/shared/form/InputError';
import { CanonicalMeta } from '~/utils/seo';
import { changeRegistrationToAuthUser } from '~/server/db/checkout.server';
import { getClientSession } from '~/server/auth/client.server';

type ActionData = {
  fields: {
    name: string;
    email: string;
  };
  errors: {
    submit?: string;
    name: string | null;
    email: string | null;
    confirmation: string | null;
    password: string | null;
  };
};

export const meta: MetaFunction = CanonicalMeta;

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);

  if (user) {
    return redirect('/me');
  }

  return null;
};

export const action: ActionFunction = async ({ request }) => {
  const loginInfoSession = await getLoginInfoSession(request);
  const t = await i18n.getFixedT(request, 'signup');
  const { searchParams } = new URL(request.url);
  const postSignUpAction = searchParams.get('a');

  const requestText = await request.text();
  const form = new URLSearchParams(requestText);
  const session = await getSession(request);

  const data = {
    name: form.get('name'),
    email: form.get('signup-email'),
    confirmation: form.get('confirmation'),
    password: form.get('password')
  };

  const Schema = z
    .object({
      name: z
        .string()
        .min(5, t('Name min length'))
        .max(60, t('Name max length')),
      email: z.string().email(t('Invalid Email')),
      confirmation: z.string().email(t('Invalid Email')),
      password: z.string().min(6, t('Password min length'))
    })
    .refine((data) => data.email === data.confirmation, {
      message: t('Emails mismatch'),
      path: ['confirmation']
    });

  try {
    await Schema.parseAsync(data);
    // split functional validations, so they don't override syntactic ones in schema
    await z
      .object({
        email: z.string()
      })
      .refine(async (data) => !(await findUserByEmail(data.email)), {
        message: t('User Already Exists'),
        path: ['email']
      })
      .refine(async (data) => verifyEmailAddress(data.email), {
        message: t('Fake email'),
        path: ['email']
      })
      .parseAsync(data);

    const { email, name, password } = data as {
      email: string;
      name: string;
      password: string;
    };

    const user = await createUser({ email, name, password });

    const headers = new Headers();

    await session.signIn(user);
    await session.getHeaders(headers);
    loginInfoSession.clean();
    await loginInfoSession.getHeaders(headers);

    if (postSignUpAction === 'favorite') {
      try {
        await addGroupToFavorites(user.id, searchParams.get('g') as string);
      } catch (err) {
        console.error(err);
        // do nothing
      }
    }

    if (postSignUpAction === 'checkout') {
      try {
        const clientSession = await getClientSession(request);

        await changeRegistrationToAuthUser(user.id, clientSession.getClientId());
      } catch (e) {
        console.error(e);
      }
    }

    return redirect('/me', { headers });
  } catch (e) {
    if (!(e instanceof ZodError)) {
      console.error(e);
      return json({
        errors: {
          submit: t('Unknown Error')
        },
        fields: {
          name: data.name || '',
          email: data.email || ''
        }
      });
    }

    const errors: { [key: string]: string | undefined } = {};

    for (const error of (e as ZodError).errors) {
      errors[error.path[0]] = error.message;
    }

    const payload: ActionData = {
      status: 'error',
      // @ts-ignore
      errors: errors,
      fields: {
        name: data.name || '',
        email: data.email || ''
      }
    };

    return json(payload);
  }
};

export const handle = {
  i18n: ['common', 'signup']
};

function defaultData(): ActionData {
  return {
    errors: {
      name: '',
      email: '',
      confirmation: '',
      password: '',
      submit: ''
    },
    fields: { name: '', email: '' }
  };
}

export default function SignUp() {
  const { t } = useTranslation('signup');
  const [searchParams] = useSearchParams();
  const { errors, fields } =
    (useActionData<ActionData>() as ActionData) || defaultData();

  return (
    <Main className="w-5/6 m-auto md:w-144">
      <H2 className="mb-2 text-secondary">{t('Sign Up')}</H2>
      <H6 variant="secondary" as="p" className="text-white mb-8">
        {t('Sign Up Instructions')}
      </H6>
      <Form
        method="post"
        className="w-full"
        action={`/signup${
          searchParams.toString().length ? `?${searchParams}` : ''
        }`}
      >
        <FormField label={t('Email')} error={errors?.email} dataCy="email">
          <TextField name="signup-email" defaultValue={fields?.name} />
        </FormField>
        <FormField
          label={t('Confirm Email')}
          error={errors?.confirmation}
          dataCy="confirmation"
        >
          <TextField name="confirmation" autoComplete="off" />
        </FormField>
        <FormField label={t('Name')} error={errors?.name} dataCy="name">
          <TextField name="name" defaultValue={fields?.name} />
        </FormField>
        <FormField
          label={t('Password')}
          error={errors?.password}
          dataCy="password"
        >
          <TextField name="password" type="password" />
        </FormField>
        <ButtonGroup>
          <ButtonLink
            variant="secondary"
            to="/"
            className="hidden md:inline-flex"
          >
            {t('Cancel')}
          </ButtonLink>
          <Button name="create">{t('Create Profile')}</Button>
        </ButtonGroup>
        {errors.submit && (
          <InputError className="mt-4" id="error-message">
            {errors.submit}
          </InputError>
        )}
      </Form>
      <p className="dark:text-blueGray-500 text-gray-500 mt-8">
        {t('Privacy Policy Presentation')} &nbsp;
        <Link to="/privacy">{t('Privacy Policy')}</Link>
      </p>
    </Main>
  );
}
