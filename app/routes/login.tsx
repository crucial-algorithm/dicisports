import { CheckoutStatus, Role } from '@prisma/client';
import { Form, Link, useActionData, useSearchParams } from '@remix-run/react';
import type { Booking } from '@prisma/client';

import { z, ZodError } from 'zod';

import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction
} from '@remix-run/node';
import { json, redirect } from '@remix-run/node';

import { useRef } from 'react';

import { useTranslation } from 'react-i18next';

import type { TFunction } from 'i18next';

import Button from '~/components/shared/Button';
import FormField from '~/components/shared/form/FormField';

import { getLoginInfoSession } from '~/server/auth/login.server';
import { getSession, getUser } from '~/server/auth/session.server';
import {
  areThereTracesOfUserEventHandling,
  findUserEvents
} from '~/server/db/events.server';
import { badRequest, bookingRedirectRoute } from '~/utils/misc';

import i18n from '~/server/i18n.server';
import InputError from '~/components/shared/form/InputError';

import { H2, H6 } from '~/components/shared/typography';

import type { LoginAction } from '~/types';

import { loginUser } from '~/server/db/users.server';
import { CanonicalMeta } from '~/utils/seo';
import {
  changeRegistrationToAuthUser,
  findBooking,
  findUserOngoingBookingsByEvent
} from '~/server/db/booking.server';
import { getClientSession } from '~/server/auth/client.server';

type LoaderData = {
  email?: string;
  error?: string;
};

const actions = {
  login: 'login',
  checkout: 'checkout',
  createEvent: 'create-event',
  reviewOrganizer: 'review'
};

type QueryStringArgs = {
  redirectTo: null | string;
  user: null | string;
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
    redirectTo: searchParams.get('l'),
    user: searchParams.get('u'),
    action
  };
}

export const handle = {
  i18n: ['common', 'login']
};

export const meta: MetaFunction = CanonicalMeta as MetaFunction;

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
    email: string;
  };
  errors: {
    email: string | null;
    password: string | null;
    submit: string | null;
  };
};

export const action: ActionFunction = async ({ request }) => {
  const loginInfoSession = await getLoginInfoSession(request);
  const t = await i18n.getFixedT(request, 'login');
  const params = new URLSearchParams(await request.text());
  const email = params.get('email') as string;
  const password = params.get('password') as string;
  const { searchParams } = new URL(request.url);
  const postLoginAction = searchParams.get('a');

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

    if (postLoginAction === actions.checkout) {
      try {
        const clientSession = await getClientSession(request);
        const bookingId = searchParams.get('b') as string;
        const booking = await findBooking(bookingId);

        // This shouldn't happen, but in case it does...
        if (!booking || booking.status === CheckoutStatus.deleted) {
          return redirect(`/?message=${t('No Booking Found')}`, { headers });
        }

        const userOngoingEventBookings = await findUserOngoingBookingsByEvent(
          user.id,
          booking.eventId
        );
        const existingBooking = filterExistingBooking(userOngoingEventBookings);

        await changeRegistrationToAuthUser(
          user.id,
          clientSession.getClientId()
        );

        return redirect(
          bookingRedirectRoute(existingBooking ? existingBooking : booking),
          { headers }
        );
      } catch (e) {
        console.error(e);
      }
    }

    if (postLoginAction === actions.createEvent) {
      return redirect('/o/event/create', { headers });
    }

    if (
      postLoginAction === actions.reviewOrganizer &&
      user.role === Role.ADMIN
    ) {
      const organizerId = searchParams.get('o') as string;

      return redirect(`/a/organizers/${organizerId}`, { headers });
    }

    if (user.role === Role.ORGANIZER) {
      return redirect('/o', { headers });
    }

    const didUserTriedEventsRecently = await areThereTracesOfUserEventHandling(
      user.id
    );

    if (didUserTriedEventsRecently) {
      const userEvents = await findUserEvents(user.id);

      if (userEvents.length === 1) {
        return redirect(`/o/event/${userEvents[0].id}`, { headers });
      }
      return redirect('/o', { headers });
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
  const { action, redirectTo } = queryStringArgs(searchParams);
  const password = useRef<HTMLInputElement | null>(null);

  function handleOnSubmit() {
    if (password?.current?.value) {
      password.current.value = '';
    }
  }

  return (
    <div className="w-5/6 m-auto md:w-144 max-w-8xl m-auto px-3">
      {action === 'favorite' ? (
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
        <input type="hidden" value={redirectTo || ''} name="location" />
        <FormField label={t('Email')} error={errors.email} id="email">
          <input
            type="email"
            id="email"
            name="email"
            className="input-text px-4 lg:px-11 w-full lg:text-lg h-14 md:h-20"
            defaultValue={fields.email}
            autoComplete="off"
          />
        </FormField>

        <FormField label={t('Password')} error={errors.password} id="password">
          <input
            id="password"
            type="password"
            name="password"
            className="input-text px-4 lg:px-11 w-full h-14 md:text-2xl md:h-20"
            autoComplete="current-password"
          />
        </FormField>
        <Button name="login">
          {t('Login')}
        </Button>
        {errors.submit && (
          <InputError className="mt-4" id="error-message">
            {errors.submit}
          </InputError>
        )}
      </Form>

      <CreateAccount
        text={t('Create Account')}
        cta={t('Create Account CTA')}
        queryString={searchParams.toString()}
      />
      <RecoverPassword text={t('Recover Password')} cta={t('Recover CTA')} />
    </div>
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
      <Link
        to={`/signup${queryString ? `?${queryString}` : ''}`}
        id="create-account"
      >
        {cta}
      </Link>
    </p>
  );
}

function RecoverPassword({ text, cta }: { text: string; cta: string }) {
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

// Since we are supporting multiple bookings of same event, we need to check if there is already an ongoing booking
// Or if there is an ongoing/pending payment of a booking for that event
function filterExistingBooking(bookings: Booking[]): Booking | null {
  if (!bookings || bookings.length === 0) {
    return null;
  }

  // Check if there is any booking with an ongoing/pending payment
  const pendingBookings = bookings.filter(
    (b) => b.status === CheckoutStatus.pending
  );

  if (pendingBookings && pendingBookings.length > 0) {
    return pendingBookings[0];
  }

  // If there is no pending bookings, filter ongoing ones and return the first one
  return bookings.filter((b) => b.status === CheckoutStatus.checkout)[0];
}
