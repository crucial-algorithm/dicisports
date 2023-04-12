import { CheckoutStatus } from '@prisma/client';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useFetcher, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import Button from '~/components/shared/Button';
import DisplayCart from '~/components/shared/DisplayCart';
import DisplayDate from '~/components/shared/DIsplayDate';

import Main from '~/components/shared/Main';
import { H2, H6 } from '~/components/shared/typography';
import { getClientSession } from '~/server/auth/client.server';
import { getUser } from '~/server/auth/session.server';
import {
  findBookingById,
  findBookingCart,
  updateBookingStatus
} from '~/server/db/booking.server';
import { findEvent } from '~/server/db/events.server';
import { findUserEventRaceParticipants } from '~/server/db/participant.server';
import type { Event, UICartRow } from '~/types';

type LoaderData = {
  event: Event;
  cart: UICartRow[];
};

export const action: ActionFunction = async ({ request, params }) => {
  const form = await request.formData();
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const bookingId = params.bookingId as string;
  const booking = await findBookingById(bookingId);

  if (!booking) {
    return redirect('/');
  }

  const eventId = booking.eventId;

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const actionId = form.get('actionId');

  if (actionId === 'update-info') {
    await updateBookingStatus(CheckoutStatus.checkout, clientId, eventId);

    return redirect(`/checkout/info/${bookingId}`);
  }

  await updateBookingStatus(CheckoutStatus.confirmed, clientId, eventId);

  return redirect(`/checkout/confirmation/${bookingId}`);
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const bookingId = params.bookingId as string;

  const booking = await findBookingById(bookingId);

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  if (!booking || booking.userId !== clientId) {
    return redirect('/');
  }

  const eventId = booking.eventId;

  const event = await findEvent(eventId);
  const cart = await findBookingCart(clientId, eventId);
  const raceParticipants = await findUserEventRaceParticipants(
    clientId,
    eventId
  );

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/checkout/cart/${eventId}`);
  }

  if (booking?.status !== CheckoutStatus.pending) {
    return redirect(
      `/checkout/${
        booking?.status === CheckoutStatus.checkout ? 'info' : 'confirmation'
      }/${bookingId}`
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
