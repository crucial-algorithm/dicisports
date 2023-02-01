import type { ActionFunction, LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import {
  Form,
  useFetcher,
  useLoaderData,
  useSearchParams
} from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { CheckoutStatus, Status } from '@prisma/client';

import Main from '~/components/shared/Main';
import { findEvent } from '~/server/db/events.server';
import { H2, H4, H5, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import type { Cart, Event, Race, RaceQtd } from '~/types';
import { badRequest, displayTimeOfDay } from '~/utils/misc';
import { getClientSession } from '~/server/auth/client.server';
import {
  addParticipantsToRace,
  addRegistration,
  addRegistrationOnUpdateCart,
  createBooking,
  findBooking,
  findEventRacesCheckoutQtd,
  findUserEventRaceParticipants,
  findUserRaceParticipants,
  getDistinctUserEventCheckoutRaces,
  getUserCheckoutRaces,
  removeBooking,
  removeRaceParticipant,
  removeRegistration
} from '~/server/db/checkout.server';
import i18n from '~/server/i18n.server';
import DisplayCart from '~/components/shared/DisplayCart';
import { getUser } from '~/server/auth/session.server';

type LoaderData = {
  event: Event;
  races: Race[];
  userCheckoutRaces: Cart[];
  hasCheckout: boolean;
};

const actions = {
  add: 'add',
  remove: 'remove',
  checkout: 'checkout'
};

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const form = await request.formData();
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const eventId = params.eventId as string;
  const { searchParams } = new URL(request.url);

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();
  const actionId = form.get('actionId') as string;
  const raceId = form.get('raceId') as string;

  try {
    if (actionId === actions.add) {
      if (searchParams.get('a') === 'update') {
        const booking = await findBooking(clientId, eventId);

        return await addRegistrationOnUpdateCart(
          clientId,
          raceId,
          booking?.id as string
        );
      }

      return await addRegistration(clientId, raceId);
    }

    if (actionId === actions.remove) {
      if (searchParams.get('a') === 'update') {
        const raceParticipants = await findUserRaceParticipants(
          clientId,
          raceId
        );

        if (!raceParticipants?.length) {
          return badRequest({ error: t('No Race Participants') });
        }

        const draftRaceParticipants = raceParticipants?.filter(
          (rp) => rp.participant.status === 'auto'
        );

        if (draftRaceParticipants?.length) {
          return await removeRaceParticipant(
            draftRaceParticipants[0].participantId,
            raceId,
            clientId
          );
        }

        return await removeRaceParticipant(
          raceParticipants[0].participantId as string,
          raceId,
          clientId
        );
      }

      return await removeRegistration(clientId, raceId);
    }

    if (actionId === actions.checkout) {
      if (searchParams.get('a') === 'update') {
        return redirect(`/checkout/info/${eventId}`);
      }

      const userCheckoutRaces = await getDistinctUserEventCheckoutRaces(
        clientId,
        eventId
      );

      if (!userCheckoutRaces) {
        return badRequest({ error: t('No Races In Checkout') });
      }

      const pin = Math.floor(1000 + Math.random() * 9000);
      const booking = await createBooking(pin, eventId, clientId);

      if (!booking) {
        return badRequest({ error: t("Can't Create Booking") });
      }

      await addParticipantsToRace(
        userCheckoutRaces.map((u) => u.raceId),
        clientId,
        booking.id
      );

      return redirect(`/checkout/info/${eventId}`);
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
  const { searchParams } = new URL(request.url);

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const eventId = params.eventId as string;
  const event = await findEvent(eventId);
  const userCheckoutRaces = await getUserCheckoutRaces(clientId, eventId);
  const booking = await findBooking(clientId, eventId);

  if (booking && !(searchParams.get('a') === 'update')) {
    return redirect(
      `/checkout/${
        booking.status === CheckoutStatus.checkout
          ? 'info'
          : booking.status === CheckoutStatus.pending
          ? 'payment'
          : 'confirmation'
      }/${eventId}`
    );
  }

  if (searchParams.get('a') === 'update') {
    const userEventRaceParticipants = await findUserEventRaceParticipants(
      clientId,
      eventId
    );

    if (!userEventRaceParticipants?.length) {
      await removeBooking(clientId, eventId);

      return redirect(`/checkout/registrations/${eventId}`);
    }
  }

  if (!event || event.status !== Status.published) {
    return redirect('/');
  }

  const races = await findEventRacesCheckoutQtd(eventId, clientId);

  return json({
    event,
    races,
    userCheckoutRaces
  });
};

export default function CheckoutRegistrationsRoute() {
  const { event, races, userCheckoutRaces } = useLoaderData<LoaderData>();
  const fetcher = useFetcher();
  const [searchParams] = useSearchParams();

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
        <div className="flex-col w-full md:w-[calc(100%-(480px))] md:pr-4">
          {races
            .sort((a: Race, b: Race) => a.displayOrder - b.displayOrder)
            .map((r: RaceQtd) => (
              <DisplayRace
                race={r}
                eventId={event.id}
                searchParams={searchParams}
                key={r.id}
              />
            ))}
        </div>
        <div className="w-full md:w-[480px]">
          <DisplayCart
            cart={userCheckoutRaces}
            event={event}
            fetcher={fetcher}
            action={`/checkout/registrations/${event.id}${
              searchParams.toString().length ? `?${searchParams}` : ''
            }`}
            showContinueLabel={searchParams.get('a') === 'update'}
          />
        </div>
      </div>
    </Main>
  );
}

function DisplayRace({
  race,
  eventId,
  searchParams
}: {
  race: RaceQtd;
  eventId: string;
  searchParams: URLSearchParams;
}) {
  const { t } = useTranslation('checkout');
  const raceTime = displayTimeOfDay(race.startTime);

  return (
    <div className="flex flex-col mb-8 w-full">
      <div className="flex flex-row items-center justify-between">
        <H4>{race.name}</H4>
        <H5>{race.price + '€'}</H5>
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
          action={`/checkout/registrations/${eventId}${
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
              data-cy={`race-${race.id}-qtd`}
            >
              {race.qtd}
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
