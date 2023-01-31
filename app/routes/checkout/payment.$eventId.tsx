import * as React from 'react';
import type { ActionFunction, LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { Form, useFetcher, useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import { CheckoutStatus } from '@prisma/client';

import Main from '~/components/shared/Main';
import { H2, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import { findEvent } from '~/server/db/events.server';
import type { Cart, Event } from '~/types';
import { getClientSession } from '~/server/auth/client.server';
import {
  findBooking,
  findUserEventRaceParticipants,
  getUserCheckoutRaces,
  updateBookingStatus
} from '~/server/db/checkout.server';
import DisplayCart from '~/components/shared/DisplayCart';
import Button from '~/components/shared/Button';
import { getUser } from '~/server/auth/session.server';

type LoaderData = {
  event: Event;
  cart: Cart[];
};

export const action: ActionFunction = async ({ request, params }) => {
  const form = await request.formData();
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const eventId = params.eventId as string;

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const actionId = form.get('actionId');

  if (actionId === 'update-info') {
    await updateBookingStatus(CheckoutStatus.checkout, clientId, eventId);

    return redirect(`/checkout/info/${eventId}`);
  }

  await updateBookingStatus(CheckoutStatus.confirmed, clientId, eventId);

  return redirect(`/checkout/confirmation/${eventId}`);
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const eventId = params.eventId as string;

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const event = await findEvent(eventId);
  const cart = await getUserCheckoutRaces(clientId, eventId);
  const raceParticipants = await findUserEventRaceParticipants(
    clientId,
    eventId
  );
  const booking = await findBooking(clientId, eventId);

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/checkout/registrations/${eventId}`);
  }

  if (booking?.status !== CheckoutStatus.pending) {
    return redirect(
      `/checkout/${
        booking?.status === CheckoutStatus.checkout ? 'info' : 'confirmation'
      }/${eventId}`
    );
  }

  return json({
    event,
    cart
  });
};

export default function CheckoutPaymentRoute() {
  const { event, cart } = useLoaderData<LoaderData>();
  const { t } = useTranslation('checkout');
  const fetcher = useFetcher();

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
      <div className="flex flex-col md:flex-row mt-8">
        {/*Payment Form*/}
        <div className="flex-col w-full md:w-[calc(100%-(480px))] md:pr-4">
          <Form method="post">
            <Button type="submit" name="pay">
              {t('Pay')}
            </Button>
          </Form>
        </div>
        <div className="w-full md:w-[480px]">
          <DisplayCart
            cart={cart}
            event={event}
            fetcher={fetcher}
            showEditInfoButton={true}
          />
        </div>
      </div>
    </Main>
  );
}
