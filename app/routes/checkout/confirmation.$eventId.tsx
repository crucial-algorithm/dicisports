import type { LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { getClientSession } from '~/server/auth/client.server';
import {
  findBooking,
  findUserRaceParticipants,
  getUserCheckoutRaces
} from '~/server/db/checkout.server';
import { findEvent } from '~/server/db/events.server';
import type { Cart, Event, Registration } from '~/types';
import Main from '~/components/shared/Main';
import { H2, H4, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import { DisplayCart } from '~/routes/checkout/registrations.$eventId';
import TextField from '~/components/shared/form/TextField';
import Button from '~/components/shared/Button';

type LoaderData = {
  registration: Registration;
  event: Event;
  cart: Cart;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const eventId = params.eventId as string;
  const clientSession = await getClientSession(request);

  const clientId = clientSession.getClientId();
  const raceParticipants = await findUserRaceParticipants(clientId, eventId);

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/checkout/registrations/${eventId}`);
  }

  if (raceParticipants[0].status !== 'confirmed') {
    return redirect(
      `/checkout/${
        raceParticipants[0].status === 'pending' ? 'payment' : 'registrations'
      }/${eventId}`
    );
  }

  const registration = await findBooking(clientId, eventId);
  const event = await findEvent(registration?.eventId as string);
  const cart = await getUserCheckoutRaces(clientId, eventId);

  return json({
    registration,
    event,
    cart
  });
};

export default function CheckoutConfirmationRoute() {
  const { registration, event, cart } = useLoaderData<LoaderData>();
  const { t } = useTranslation('checkout');

  return (
    <Main>
      <div className="flex flex-col justify-start space-y-1">
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

      <div className="flex flex-col md:flex-row">
        <div className="flex-col w-full md:w-[50%] mt-8">
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
        <div className="w-full mt-8 md:w-[50%] md:mt-0 md:pl-48">
          <DisplayCart cart={cart} event={event} />
        </div>
      </div>
    </Main>
  );
}
