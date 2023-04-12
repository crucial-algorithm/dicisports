import { CheckoutStatus } from '@prisma/client';
import type { LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

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
import type { Booking, Event, UICartRow } from '~/types';

type LoaderData = {
  registration: Booking;
  event: Event;
  cart: UICartRow;
  isAuth: boolean;
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
    isAuth: !!authenticatedClient
  });
};

export default function CheckoutConfirmationRoute() {
  const { registration, event, cart, isAuth } = useLoaderData<LoaderData>();
  const { t } = useTranslation('checkout');
  const fetcher = useFetcher();

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
          <a href={`/login?a=checkout&e=${event.id}`} data-cy="authenticate">
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

          <div className="flex flex-col items-start mt-16">
            <H6 className="dark:text-blueGray-500">
              {t('Mail Confirmation Details')}
            </H6>
            <TextField
              name="mail-confirmation"
              className="w-[350px] p-8"
              placeholder={t('Email Address')}
            />
            <Button name="send-confirmation" type="button" className="mt-4">
              {t('Send')}
            </Button>
          </div>
        </div>
        <div className="w-full md:w-[480px] mt-4 md:mt-0">
          <DisplayCart
            cart={cart}
            event={event}
            fetcher={fetcher}
            hideCheckoutButton={true}
          />
        </div>
      </div>
    </Main>
  );
}
