import { Form, Link, useActionData, useSearchParams } from '@remix-run/react';

import { z, ZodError } from 'zod';

import type { ActionFunction, LoaderFunction, MetaFunction } from 'remix';
import { json, redirect } from 'remix';

import { useRef } from 'react';

import { useTranslation } from 'react-i18next';

import type { TFunction } from 'i18next';

import Button from '~/components/shared/Button';
import TextField from '~/components/shared/form/TextField';
import FormField from '~/components/shared/form/FormField';

import { getLoginInfoSession } from '~/server/auth/login.server';
import { getSession, getUser } from '~/server/auth/session.server';
import { badRequest, getDomainUrl } from '~/utils/misc';

import i18n from '~/server/i18n.server';
import InputError from '~/components/shared/form/InputError';

import { H2, H6 } from '~/components/shared/typography';

import { sendWhatsAppGroupLink, subscribeUser } from '~/server/email.server';
import { addGroupToFavorites, findGroup } from '~/server/db/groups.server';
import type { LoginAction } from '~/types';

import { loginUser } from '~/server/db/users.server';
import Main from '~/components/shared/Main';
import { CanonicalMeta } from '~/utils/seo';

type LoaderData = {
  email?: string;
  error?: string;
};

const actions = {
  login: 'login',
  joinWhatsAppGroup: 'ws',
  addToFavorites: 'favorite'
};

type QueryStringArgs = {
  group: null | string;
  redirectTo: null | string;
  action: LoginAction;
};

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

export const meta: MetaFunction = CanonicalMeta;

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);

  if (user) {
    return redirect('/me');
  }

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

type ActionData = {
  fields: {
    email: string
  },
  errors: {
    email: string | null,
    password: string | null
    submit: string | null
  }
}

async function sendWhatsAppLinkFlow(request: Request, params: URLSearchParams) {
  const t = await i18n.getFixedT(request, 'login');
  const email = params.get('email') as string;
  const domainUrl = getDomainUrl(request);
  const redirectTo = params.get('location');
  const groupId = params.get('group');

  function submitError(error: string, email: string) {
    return {
      fields: { email },
      errors: {
        email: '',
        password: '',
        submit: error
      }
    };
  }

  if (!groupId) {
    return json(submitError(t('Join WhatsApp: Missing group'), email));
  }
  const group = await findGroup(groupId);

  if (!group || !group.whatsapp) {
    return json({
      fields: { email },
      errors: {
        email: '',
        password: '',
        submit: !group
          ? t('Join WhatsApp: Group not found')
          : t('Join WhatsApp: Group does not have whatsapp')
      }
    });
  }

  await sendWhatsAppGroupLink({
    emailAddress: email,
    domainUrl,
    groupName: group.name || '',
    whatsAppLink: group.whatsapp
  });

  await subscribeUser(email);

  return redirect(
    redirectTo ? `${redirectTo}&message=${t('WhatsApp Email Sent')}` : '/login'
  );
}

export const action: ActionFunction = async ({ request }) => {
  const loginInfoSession = await getLoginInfoSession(request);
  const t = await i18n.getFixedT(request, 'login');
  const params = new URLSearchParams(await request.text());
  const email = params.get('email') as string;
  const password = params.get('password') as string;
  const action = params.get('action') as LoginAction;
  const { searchParams } = new URL(request.url);
  const postLoginAction = searchParams.get('a');

  // Is this not to login but to share whatsapp group link?
  if (action === actions.joinWhatsAppGroup) {
    return sendWhatsAppLinkFlow(request, params);
  }

  const Schema = z.object({
    email: z.string().email(t('Invalid Email')),
    password: z.string().min(1, t('Password min length'))
  });

  try {
    Schema.parse({
      email,
      password
    });
    const user = await loginUser({ email: email, password });

    if (!user) {
      return json({
        errors: { email: '', password: '', submit: t('Login Failed') },
        fields: { email }
      });
    }

    const session = await getSession(request);
    const headers = new Headers();

    await session.signIn(user);
    await session.getHeaders(headers);
    loginInfoSession.clean();
    await loginInfoSession.getHeaders(headers);

    if (postLoginAction === 'favorite') {
      try {
        await addGroupToFavorites(user.id, searchParams.get('g') as string);
      } catch (err) {
        console.error(err);
        // do nothing
      }
    }

    return redirect('/', { headers });

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

    return json({ errors, fields: { email } });
  }
};

function defaultData(): ActionData {
  return {
    errors: {
      email: '',
      password: '',
      submit: ''
    },
    fields: { email: '' }
  };
}

export default function Login() {
  const { errors, fields } =
    (useActionData<ActionData>() as ActionData) || defaultData();
  const { t } = useTranslation('login');
  const [searchParams] = useSearchParams();
  const { action, group, redirectTo } = queryStringArgs(searchParams);
  const password = useRef<HTMLInputElement | null>(null);

  function handleOnSubmit() {
    if (password?.current?.value) {
      password.current.value = '';
    }
  }


  return (
    <Main className="w-5/6 m-auto md:w-144">
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
        action={`/login${
          searchParams.toString().length ? `?${searchParams}` : ''
        }`}
        onSubmit={handleOnSubmit}
      >
        <input type="hidden" value={action || ''} name="action" />
        <input type="hidden" value={group || ''} name="group" />
        <input type="hidden" value={redirectTo || ''} name="location" />
        <FormField label={t('Email')} error={errors.email}>
          <TextField
            name="email"
            className="w-full text-sm h-14 md:text-2xl md:h-20"
            defaultValue={fields.email}
            autoComplete="off"
          />
        </FormField>
        {action !== actions.joinWhatsAppGroup && (
          <FormField label={t('Password')} error={errors.password}>
            <TextField
              type="password"
              name="password"
              className="w-full text-sm h-14 md:text-2xl md:h-20"
              autoComplete="off"
            />
          </FormField>
        )}
        <Button name="login">{t(action === 'ws' ? 'Email WhatsApp Link' : 'Login')}</Button>
        {errors.submit && (
          <InputError className="mt-4" id="error-message">
            {errors.submit}
          </InputError>
        )}
      </Form>

      {action !== actions.joinWhatsAppGroup && (
        <>
          <CreateAccount
            text={t('Create Account')}
            cta={t('Create Account CTA')}
            queryString={searchParams.toString()}
          />
          <RecoverPassword
            text={t('Recover Password')}
            cta={t('Recover CTA')}
          />
        </>
      )}
    </Main>
  );
}

function CreateAccount({
  text,
  cta,
  queryString
}: {
  text: string;
  cta: string;
  queryString: string;
}) {

  return (
    <p className="dark:text-blueGray-500 text-gray-500 mt-8">
      {text} &nbsp;
      <Link to={`/signup${queryString ? `?${queryString}` : '' }`}>
        {cta}
      </Link>
    </p>
  );
}

function RecoverPassword({
  text,
  cta
}: {
  text: string;
  cta: string
}) {
  return (
    <p className="dark:text-blueGray-500 text-gray-500 mt-2">
      {text} &nbsp;
      <Link to="/recover">{cta}</Link>
    </p>
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
