import type { LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { useFetcher, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckoutStatus } from '@prisma/client';

import { getClientSession } from '~/server/auth/client.server';
import {
  findBooking,
  findUserRaceParticipants,
  getUserCheckoutRaces
} from '~/server/db/checkout.server';
import { findEvent } from '~/server/db/events.server';
import type { Booking, Cart, Event } from '~/types';
import Main from '~/components/shared/Main';
import { H2, H4, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import DisplayCart from '~/components/shared/DisplayCart';
import TextField from '~/components/shared/form/TextField';
import Button from '~/components/shared/Button';
import { getUser } from '~/server/auth/session.server';

type LoaderData = {
  registration: Booking;
  event: Event;
  cart: Cart;
  isAuth: boolean;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const eventId = params.eventId as string;
  const clientSession = await getClientSession(request);
  const authClient = await getUser(request);

  const clientId =
    authClient !== null ? authClient.id : clientSession.getClientId();
  const raceParticipants = await findUserRaceParticipants(clientId, eventId);
  const booking = await findBooking(clientId, eventId);

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/checkout/registrations/${eventId}`);
  }

  if (booking?.status !== CheckoutStatus.confirmed) {
    return redirect(
      `/checkout/${
        booking?.status === CheckoutStatus.pending ? 'payment' : 'registrations'
      }/${eventId}`
    );
  }

  const registration = await findBooking(clientId, eventId);
  const event = await findEvent(registration?.eventId as string);
  const cart = await getUserCheckoutRaces(clientId, eventId);

  return json({
    registration,
    event,
    cart,
    isAuth: !!authClient
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
          <a href={`/login?a=checkoutAuth&u=${registration.userId}`}>
            <H6 className="dark:text-blueGray-500">{t('Login')}</H6>
          </a>
        </div>
      )}

      <div className="flex flex-col md:flex-row">
        <div className="flex-col w-full md:w-[calc(100%-(480px))] md:pr-4">
          <H4>{t('Thanks For Buying')}</H4>

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
          <DisplayCart cart={cart} event={event} fetcher={fetcher} isConfirmation={true} />
        </div>
      </div>
    </Main>
  );
}
