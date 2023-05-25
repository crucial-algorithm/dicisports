import { CheckoutStatus } from '@prisma/client';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData
} from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import Button from '~/components/shared/Button';
import DisplayCart from '~/components/shared/DisplayCart';
import DisplayDate from '~/components/shared/DIsplayDate';
import TextField from '~/components/shared/form/TextField';
import Main from '~/components/shared/Main';
import { H2, H4, H6 } from '~/components/shared/typography';

import { getClientSession } from '~/server/auth/client.server';
import { getUser } from '~/server/auth/session.server';
import { findBookingById, findBookingCart } from '~/server/db/booking.server';
import { findEvent } from '~/server/db/events.server';
import { findUserEventRaceParticipants } from '~/server/db/participant.server';
import type { KCDHandle } from '~/types';
import type { Booking, Event, UICartRow } from '~/types';
import { badRequest, getDomainUrl } from '~/utils/misc';
import { sendBookingConfirmationEmail } from '~/server/email.server';
import i18n from '~/server/i18n.server';
import InputError from '~/components/shared/form/InputError';
import FormField from '~/components/shared/form/FormField';

type LoaderData = {
  registration: Booking;
  event: Event;
  cart: UICartRow;
  isAuth: boolean;
  bookingId: string;
};

type ActionData = {
  fields: {
    email: string;
  };
  errors: {
    email?: string;
    submit?: string;
  };
  successMessage: string | null;
};

export const handle: KCDHandle & { id: string; i18n: string[] } = {
  id: 'payment-confirmed',
  i18n: ['checkout']
};

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, ['checkout']);
  const form = await request.formData();

  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const bookingId = params.bookingId as string;

  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const booking = await findBookingById(bookingId);

  if (!booking) {
    return badRequest({
      error: t('No Booking')
    });
  }

  const eventId = booking.eventId;
  const event = await findEvent(eventId);
  const domainUrl = getDomainUrl(request);
  const cart = await findBookingCart(clientId, eventId);
  const email = form.get('email') as string;

  try {
    z.string().email().parse(email);
  } catch (e) {
    return json({
      errors: { email: t('Invalid Email') },
      fields: { email }
    });
  }

  await sendBookingConfirmationEmail({
    emailAddress: email,
    event,
    booking,
    domainUrl,
    cart,
    userName: authenticatedClient !== null ? authenticatedClient.name : null
  });

  return json({
    errors: {},
    fields: { email },
    successMessage: t('Booking Confirmation Email Sent')
  });
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const bookingId = params.bookingId as string;

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const booking = await findBookingById(bookingId);

  if (!booking || booking.userId !== clientId) {
    return redirect('/');
  }

  const eventId = booking.eventId;
  const raceParticipants = await findUserEventRaceParticipants(
    clientId,
    eventId
  );

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/checkout/cart/${eventId}`);
  }

  if (booking.status !== CheckoutStatus.confirmed) {
    return redirect(
      `/checkout/${
        booking?.status === CheckoutStatus.pending ? 'payment' : 'cart'
      }/${bookingId}`
    );
  }

  const event = await findEvent(eventId);
  const cart = await findBookingCart(clientId, eventId);

  return json({
    registration: booking,
    event,
    cart,
    isAuth: !!authenticatedClient,
    bookingId
  });
};

export default function CheckoutConfirmationRoute() {
  const { registration, event, cart, isAuth, bookingId } = useLoaderData<LoaderData>();
  const { t } = useTranslation('checkout');
  const fetcher = useFetcher();
  const { errors, fields, successMessage } =
    (useActionData<ActionData>() as ActionData) || {
      errors: { email: '', submit: '' },
      fields: { email: '' }
    };

  return (
    <Main>
      <div className="flex flex-col justify-start space-y-1 mb-8">
        <H2>
          <b data-cy="name" className="break-words w-full">
            {event.name}
          </b>
        </H2>
        <H6>
          <DisplayDate date={new Date(event.startAt)} />
        </H6>
        <H6>{event.address}</H6>
      </div>

      {!isAuth && (
        <div className="flex flex-row items-center justify-end gap-x-2">
          <H6>{t('Already Have An Account ?')}</H6>
          <a href={`/login?a=checkout&b=${bookingId}`} data-cy="authenticate">
            <H6 className="dark:text-blueGray-500 cursor-pointer">
              {t('Login')}
            </H6>
          </a>
        </div>
      )}

      <div className="flex flex-col md:flex-row">
        <div className="flex-col w-full md:w-[calc(100%-(480px))] md:pr-4">
          <H4 data-cy="confirmation-label">{t('Thanks For Buying')}</H4>

          <div className="text-center">
            <div className="mt-8">
              <H4>{t('Confirmation ID')}</H4>
              <H6 className="dark:text-blueGray-500">{registration.id}</H6>
            </div>

            <div className="mt-8">
              <H4>{t('PIN')}</H4>
              <H6 className="dark:text-blueGray-500">{registration.pin}</H6>
            </div>
          </div>

          {!isAuth && (
            <Form method="post" className="flex flex-col items-start mt-16">
              <FormField
                label={t('Mail Confirmation Details')}
                error={errors.email}
              >
                <TextField
                  name="email"
                  className="w-1/2 p-8"
                  placeholder={t('Email Address')}
                  defaultValue={fields.email}
                />
              </FormField>
              <Button name="send-confirmation" type="submit" className="mt-4">
                {t('Send')}
              </Button>
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
          )}
        </div>
        <div className="w-full md:w-[480px] mt-4 md:mt-0">
          <DisplayCart cart={cart} event={event} fetcher={fetcher} />
        </div>
      </div>
    </Main>
  );
}
