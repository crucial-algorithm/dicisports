import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import type { ActionFunction , LoaderFunction} from 'remix';
import { json, redirect } from 'remix';

import { z, ZodError } from 'zod';

import React from 'react';

import { useTranslation } from 'react-i18next';

import { getSession, getUser } from '~/server/auth/session.server';
import { getLoginInfoSession } from '~/server/auth/login.server';
import { badRequest } from '~/utils/misc';
import i18n from '~/server/i18n.server';
import { createUser, findUserByEmail } from '~/server/db/users.server';
import Button, { ButtonLink } from '~/components/shared/Button';

import ButtonGroup from '~/components/shared/ButtonGroup';
import Main from '~/components/shared/Main';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import { H2, H6 } from '~/components/shared/typography';
import { verifyEmailAddress } from '~/server/auth/verifier.server';
import { addGroupToFavorites } from "~/server/db/groups.server";

type ActionData = {
  fields: {
    name: string;
    email: string;
  };
  errors: {
    generalError?: string;
    name: string | null;
    email: string | null;
    confirmation: string | null;
    password: string | null;
  };
};

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
    email: form.get('email'),
    confirmation: form.get('confirmation'),
    password: form.get('password')
  };

  const Schema = z
    .object({
      name: z
        .string()
        .min(5, t('Name min length'))
        .max(60, t('Name max length')),
      email: z
        .string()
        .email(t('Invalid Email'))
        .refine(async (v) => !(await findUserByEmail(v)), t('User Already Exists'))
        .refine(async (v) => verifyEmailAddress(v), t('Fake email')),
      confirmation: z.string().email(t('Invalid Email')),
      password: z.string().min(6, t('Password min length'))
    })
    .refine((data) => data.email === data.confirmation, {
      message: t('Emails mismatch'),
      path: ['confirmation']
    });

  try {
    await Schema.parseAsync(data);
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

    return redirect('/me', { headers });
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
      password: ''
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
    <Main className="flex flex-col w-full h-full p-8 max-w-lg m-auto justify-center align-middle">
      <H2 className="mb-2 text-secondary">{t('Sign Up')}</H2>
      <H6 variant="secondary" as="p" className="text-white mb-8">
        {t('Sign Up Instructions')}
      </H6>
      <Form
        method="post"
        className="w-96"
        action={`/signup${
          searchParams.toString().length ? `?${searchParams}` : ''
        }`}
      >
        <FormField label={t('Email')} error={errors?.email}>
          <TextField name="email" defaultValue={fields?.name} />
        </FormField>
        <FormField label={t('Confirm Email')} error={errors?.confirmation}>
          <TextField name="confirmation" autoComplete="off" />
        </FormField>
        <FormField label={t('Name')} error={errors?.name}>
          <TextField name="name" defaultValue={fields?.name} />
        </FormField>
        <FormField label={t('Password')} error={errors?.password}>
          <TextField name="password" type="password" />
        </FormField>
        <ButtonGroup>
          <ButtonLink variant="secondary" to="/">
            {t('Cancel')}
          </ButtonLink>
          <Button>{t('Create Profile')}</Button>
        </ButtonGroup>
      </Form>
      <p className="dark:text-blueGray-500 text-gray-500 mt-8">
        {t('Privacy Policy Presentation')} &nbsp;
        <Link to="/privacy">{t('Privacy Policy')}</Link>
      </p>
    </Main>
  );
}
