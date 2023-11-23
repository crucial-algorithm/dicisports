import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import type { Event } from '@prisma/client';
import { CheckoutStatus, Status } from '@prisma/client';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import {
  Form,
  useFetcher,
  useLoaderData,
  useSearchParams
} from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import DisplayCart from '~/components/shared/DisplayCart';
import DisplayDate from '~/components/shared/DIsplayDate';

import Main from '~/components/shared/Main';
import { H2, H4, H5, H6 } from '~/components/shared/typography';
import { getClientSession } from '~/server/auth/client.server';
import { getUser } from '~/server/auth/session.server';
import {
  findBooking,
  findBookingCart,
  removeBooking
} from '~/server/db/booking.server';
import { findEvent } from '~/server/db/events.server';
import {
  addParticipantToRace,
  findUserEventRaceParticipants,
  findUserRaceParticipants,
  removeRaceParticipant
} from '~/server/db/participant.server';
import { findEventRaces } from '~/server/db/races.server';
import i18n from '~/server/i18n.server';
import type { Booking, Race, RaceQty, UICartRow } from '~/types';
import { badRequest, displayTimeOfDay } from '~/utils/misc';
import Button from '~/components/shared/Button';

type LoaderData = {
  event: Event;
  races: Race[];
  userCheckoutRaces: UICartRow[];
  hasCheckout: boolean;
  bookingId: string;
};

const actions = {
  add: 'add',
  remove: 'remove',
  checkout: 'checkout'
};

export const handle: { id: string; i18n: string[] } = {
  id: 'checkout',
  i18n: ['checkout']
};

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const language = await i18n.getLocale(request);
  const form = await request.formData();
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const bookingId = params.bookingId as string;

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();
  const actionId = form.get('actionId') as string;
  const raceId = form.get('raceId') as string;

  const booking: Booking | null = await findBooking(bookingId);

  if (!booking || (booking && booking.userId !== clientId) || booking.status === CheckoutStatus.deleted) {
    return redirect('/');
  }

  if (booking.status === CheckoutStatus.confirmed) {
    return redirect(`/checkout/confirmation/${booking.id}`);
  }

  const eventId = booking.eventId;
  const event = await findEvent(eventId);

  if (!event) {
    return redirect('/');
  }

  try {
    // Triggered when user clicks continue in the cart screen
    if (actionId === actions.checkout) {
      const userEventRaceParticipants = await findUserEventRaceParticipants(
        bookingId
      );

      if (!userEventRaceParticipants?.length) {
        await removeBooking(bookingId);

        return redirect(`/${language}/event/${booking.eventId}`);
      }

      return redirect(`/checkout/info/${booking.id}`);
    }

    if (actionId === actions.add) {
      await addParticipantToRace(clientId, raceId, booking.id, eventId);
    }

    if (actionId === actions.remove) {
      const raceParticipants = await findUserRaceParticipants(clientId, raceId, bookingId);

      if (!raceParticipants?.length) {
        return badRequest({ error: t('No Race Participants') });
      }

      const draftRaceParticipants = raceParticipants?.filter(
        (rp) => rp.participant.status === 'auto'
      );

      await removeRaceParticipant(
        draftRaceParticipants[0]
          ? draftRaceParticipants[0].participantId
          : raceParticipants[0].participantId,
        raceId,
        bookingId
      );
    }

    return json({});
  } catch (e) {
    console.log(e);

    return json({});
  }
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const bookingId = params.bookingId as string;
  const booking = await findBooking(bookingId);

  if (!booking || (booking && booking.userId !== clientId) || booking.status === CheckoutStatus.deleted) {
    return redirect('/');
  }

  if (booking.status === CheckoutStatus.confirmed) {
    return redirect(`/checkout/confirmation/${booking.id}`);
  }

  const eventId = booking.eventId;
  const userCheckoutRaces = await findBookingCart(bookingId);
  const event = await findEvent(eventId);
  const races = await findEventRaces(eventId);

  if (!event || event.status !== Status.published) {
    return redirect('/');
  }

  return json({
    event,
    races,
    userCheckoutRaces,
    bookingId
  });
};

export default function CheckoutRegistrationsRoute() {
  const { t } = useTranslation('checkout');
  const { event, races, userCheckoutRaces, bookingId } =
    useLoaderData<LoaderData>() as LoaderData;
  const fetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const raceQties: RaceQty[] = races.map((r) => {
    const raceInCart = userCheckoutRaces.find((c) => c.raceId === r.id);

    return {
      ...r,
      qty: raceInCart ? raceInCart.qty : 0
    };
  });

  return (
    <Main>
      <div className="flex flex-col justify-start space-y-1">
        <H2>
          <b data-cy="name" className="break-words w-full">
            {event.name}
          </b>
        </H2>
        <H6>
          <DisplayDate date={new Date(event.startAt || 0)} />
        </H6>
        <H6>{event.placeName}</H6>
      </div>
      <div className="flex flex-col md:flex-row mt-8">
        <div className="flex-col w-full md:w-[calc(100%-(480px))] md:pr-4">
          {raceQties
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((r: RaceQty) => (
              <DisplayRace
                race={r}
                bookingId={bookingId}
                searchParams={searchParams}
                key={r.id}
              />
            ))}
        </div>
        <div className="w-full md:w-[480px]">
          <fetcher.Form
            method="post"
            action={`/checkout/cart/${bookingId}${
              searchParams.toString().length ? `?${searchParams}` : ''
            }`}
          >
            <DisplayCart cart={userCheckoutRaces} event={event}>
              <div className="flex flex-col items-center w-full">
                <Button
                  type="submit"
                  name="actionId"
                  value="checkout"
                  disabled={userCheckoutRaces.length === 0}
                  className="mt-4 w-full"
                  id="checkout"
                >
                  {searchParams.get('a') === 'update'
                    ? t('Continue')
                    : t('Checkout now')}
                </Button>
              </div>
            </DisplayCart>
          </fetcher.Form>
        </div>
      </div>
    </Main>
  );
}

function DisplayRace({
  race,
  bookingId,
  searchParams
}: {
  race: RaceQty;
  bookingId: string;
  searchParams: URLSearchParams;
}) {
  const { t } = useTranslation('checkout');
  const raceTime = displayTimeOfDay(race.startTime);

  return (
    <div className="flex flex-col mb-8 w-full">
      <div className="flex flex-row items-center justify-between">
        <H4>{race.name}</H4>
        <H5>{race.price / 1000}€</H5>
      </div>
      <div className="flex flex-row mt-2 justify-between items-center">
        <div className="flex flex-row">
          <div>
            <H6 className="dark:text-blueGray-500">{t('Distance')}</H6>
            <H5>{race.distance + ' km'}</H5>
          </div>

          <div className="ml-8">
            <H6 className="dark:text-blueGray-500">{t('Hour')}</H6>
            <H5>{raceTime}</H5>
          </div>
        </div>

        <Form
          method="post"
          action={`/checkout/cart/${bookingId}${
            searchParams.toString().length ? `?${searchParams}` : ''
          }`}
        >
          <div className="flex flex-row items-center dark:text-blueGray-500 w-[80px] justify-between">
            <input type="hidden" name="raceId" value={race.id as string} />
            <button
              id={`remove-race-${race.id}`}
              type="submit"
              className="w-[24px] h-[24px]"
              name="actionId"
              value={actions.remove}
            >
              <ChevronDownIcon className="md:h-6 w-6 m-0 inline-block" />
            </button>

            <H6
              className="dark:text-blueGray-500"
              data-cy={`race-${race.id}-qty`}
            >
              {race.qty}
            </H6>
            <button
              id={`add-race-${race.id}`}
              type="submit"
              className="w-[24px] h-[24px]"
              name="actionId"
              value={actions.add}
            >
              <ChevronUpIcon className="md:h-6 w-6 m-0 inline-block" />
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
