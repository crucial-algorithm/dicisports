import { Form, useLoaderData } from '@remix-run/react';

import type {
  ActionFunction,
  LoaderFunction } from 'remix';

import { json, redirect } from 'remix';

import { Link, useSearchParams } from '@remix-run/react';

import { useState } from 'react';

import { useTranslation } from 'react-i18next';

import type { TFunction } from 'i18next';

import Button from '~/components/shared/Button';
import TextField from '~/components/shared/form/TextField';
import FormField from '~/components/shared/form/FormField';


import { getLoginInfoSession } from '~/server/auth/login.server';
import { getUser, sendToken } from '~/server/auth/session.server';
import { verifyEmailAddress } from '~/server/auth/verifier.server';
import { getDomainUrl, getErrorMessage } from '~/utils/misc';


import i18n from '~/server/i18n.server';
import InputError from '~/components/shared/form/InputError';


import { H2, H6 } from '~/components/shared/typography';


import { sendWhatsAppGroupLink, subscribeUser } from '~/server/email.server';
import { findGroup } from '~/server/db/groups.server';
import type { LoginAction } from '~/types';

function validateEmail(email: string | null): boolean {
  if (!email) {return false;}
  return !!email.match(/.+@.+/);
}

type LoaderData = {
  email?: string
  error?: string
}

const actions = {
  login: 'login',
  joinWhatsAppGroup: 'ws',
  addToFavorites: 'favorite'
};

type QueryStringArgs = {
  group: null | string
  redirectTo: null | string
  action: LoginAction
}

function queryStringArgs(searchParams: URLSearchParams): QueryStringArgs {
  const a = searchParams.get('a');
  // @ts-ignore
  const action: LoginAction =
    a === null
      ? actions.login
      : Object.values(actions).find((v) => v === a) || actions.login;

  return {
    group: searchParams.get('g'),
    redirectTo: searchParams.get('l'),
    action
  };
}

export const handle = {
  i18n: ['common', 'login']
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);

  if (user) {return redirect('/me');}

  const loginSession = await getLoginInfoSession(request);

  const data: LoaderData = {
    email: loginSession.getEmail(),
    error: loginSession.getError()
  };

  const headers = new Headers({
    'Cache-Control': 'private, max-age=7200',
    Vary: 'Cookie'
  });

  await loginSession.getHeaders(headers);

  return json(data, { headers });
};

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'profile');
  const params = new URLSearchParams(await request.text());
  const loginSession = await getLoginInfoSession(request);
  const emailAddress = params.get('email');
  const action = params.get('action') as LoginAction;

  if (emailAddress) {loginSession.setEmail(emailAddress);}

  if (!emailAddress || !validateEmail(emailAddress)) {
    loginSession.flashError(t('Invalid Email'));
    return redirect('/login', {
      status: 400,
      headers: await loginSession.getHeaders()
    });
  }

  try {
    const verifierResult = await verifyEmailAddress(emailAddress);

    if (!verifierResult.status) {
      const errorMessage = t('Email Error', {
        error: verifierResult.error.message
      });

      loginSession.flashError(errorMessage);
      return redirect('/login', {
        status: 400,
        headers: await loginSession.getHeaders()
      });
    }
  } catch (error: unknown) {
    console.error('There was an error verifying an email address:', error);
    // continue on... This was probably our fault...
    // IDEA: notify me of this issue...
  }

  const domainUrl = getDomainUrl(request);
  const redirectTo = params.get('location');
  const groupId = params.get('group');

  // Is this not to login but to share whatsapp group link?
  if (action === actions.joinWhatsAppGroup) {
    if (!groupId) {
      loginSession.flashError(t('Join WhatsApp: Missing group'));
      return redirect('/login', {
        status: 400,
        headers: await loginSession.getHeaders()
      });
    }
    const group = await findGroup(groupId);

    if (!group || !group.whatsapp) {
      loginSession.flashError(
        !group
          ? t('Join WhatsApp: Group not found')
          : t('Join WhatsApp: Group does not have whatsapp')
      );
      return redirect('/login', {
        status: 400,
        headers: await loginSession.getHeaders()
      });
    }

    await sendWhatsAppGroupLink({
      emailAddress,
      domainUrl,
      groupName: group.name || '',
      whatsAppLink: group.whatsapp
    });

    await subscribeUser(emailAddress);

    return redirect(
      redirectTo
        ? `${redirectTo}&message=${t('WhatsApp Email Sent')}`
        : '/login'
    );
  }

  try {
    const magicLink = await sendToken({
      emailAddress,
      domainUrl,
      action,
      group: groupId
    });

    loginSession.setMagicLink(magicLink);
    return redirect('/login', {
      headers: await loginSession.getHeaders()
    });
  } catch (e: unknown) {
    loginSession.flashError(t(getErrorMessage(e)));
    return redirect('/login', {
      status: 400,
      headers: await loginSession.getHeaders()
    });
  }
};

function LoginButton({
  disabled = false,
  label
}: {
  disabled: boolean
  label: string
}) {
  return <Button disabled={disabled}>{label}</Button>;
}

export default function Login() {
  const data = useLoaderData<LoaderData>();
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState<string | undefined>();
  const formIsValid = email?.match(/.+@.+/);
  const { t } = useTranslation('login');
  const [searchParams] = useSearchParams();
  const { action, group, redirectTo } = queryStringArgs(searchParams);

  function onSubmit() {
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col w-full h-full p-8 max-w-lg m-auto justify-center align-middle">
      {action === 'ws' ? (
        <WhatsAppHeader t={t} />
      ) : action === 'favorite' ? (
        <AddToFavoritesHeader t={t} />
      ) : (
        <LoginHeader t={t} />
      )}
      <Form
        autoComplete="off"
        className="w-full"
        method="post"
        onChange={(event) => {
          const form = event.currentTarget;

          setEmail(form.email.value);
        }}
        onSubmit={onSubmit}
      >
        <input type="hidden" value={action || ''} name="action" />
        <input type="hidden" value={group || ''} name="group" />
        <input type="hidden" value={redirectTo || ''} name="location" />
        <FormField label={t('Email')}>
          <TextField
            name="email"
            className="w-full text-sm h-14 md:text-2xl md:h-20"
            defaultValue={email}
            autoComplete="off"
          />
        </FormField>
        <LoginButton
          disabled={!formIsValid || submitted}
          label={t(
            action === null ? 'Email a login link' : 'Email WhatsApp Link'
          )}
        />
        {data.error ? (
          <InputError id="error-message">{data.error}</InputError>
        ) : data.email ? (
          <p
            id="success-message"
            className="dark:text-blueGray-500 text-gray-500 text-lg mt-2"
          >
            <span role="img" aria-label="sparkles">
              ✨
            </span>{' '}
            {t(
              action === null
                ? 'A magic link has been sent to you'
                : 'WhatsApp Link Success'
            )}
          </p>
        ) : null}
      </Form>
      <p className="dark:text-blueGray-500 text-gray-500 mt-8">
        {t('Privacy Policy Presentation')} &nbsp;
        <Link to="/privacy">{t('Privacy Policy')}</Link>
      </p>
    </div>
  );
}

function LoginHeader({ t }: { t: TFunction }) {
  return (
    <>
      <H2 className="mb-2 text-secondary">{t('Sign In')}</H2>
      <H6 variant="secondary" as="p" className="text-white mb-8">
        {t('Sign In Instructions')}
      </H6>
    </>
  );
}

function WhatsAppHeader({ t }: { t: TFunction }) {
  return (
    <>
      <H2 className="mb-2 text-secondary">{t('WhatsApp Header')}</H2>
      <H6 variant="secondary" as="p" className="text-white mb-8">
        {t('WhatsApp Link Instructions')}
      </H6>
    </>
  );
}

function AddToFavoritesHeader({ t }: { t: TFunction }) {
  return (
    <>
      <H2 className="mb-2 text-secondary">{t('Sign In')}</H2>
      <H6 variant="secondary" as="p" className="text-white mb-8">
        {t('Add To Favorites Sign In Instructions')}
      </H6>
    </>
  );
}
