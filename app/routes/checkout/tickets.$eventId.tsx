import type { ActionFunction, LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { Form, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

import Main from '~/components/shared/Main';
import { findEvent } from '~/server/db/events.server';
import { H2, H4, H5, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import type { Cart, Event, Race, RaceQtd } from '~/types';
import { badRequest, displayTimeOfDay } from '~/utils/misc';
import Button from '~/components/shared/Button';
import { getClientSession } from '~/server/auth/client.server';
import {
  addParticipantToRace,
  addTicket,
  findEventRacesCheckoutQtd,
  findUserRaceParticipants,
  getDistinctUserEventTickets,
  getUserCheckoutRaces,
  removeTicket
} from '~/server/db/checkout.server';
import i18n from '~/server/i18n.server';

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
  const clientSession = await getClientSession(request);
  const eventId = params.eventId as string;

  const clientId = clientSession.getClientId();
  const actionId = form.get('actionId') as string;
  const raceId = form.get('raceId') as string;

  try {
    if (actionId === actions.add) {
      return await addTicket(clientId, raceId);
    }

    if (actionId === actions.remove) {
      return await removeTicket(clientId, raceId);
    }

    if (actionId === actions.checkout) {
      const userCheckoutRace = await getDistinctUserEventTickets(
        clientId,
        eventId
      );

      if (!userCheckoutRace) {
        return badRequest({ error: t('No Races In Checkout') });
      }

      for (const uc of userCheckoutRace) {
        await addParticipantToRace(uc.raceId as string, clientId);
      }

      return redirect(`/checkout/info/${eventId}`);
    }

    return json({});
  } catch (e) {
    console.log(e);

    return json({});
  }
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const clientSession = await getClientSession(request);
  const clientId = clientSession.getClientId();

  const eventId = params.eventId as string;
  const event = await findEvent(eventId);
  const userCheckoutRaces = await getUserCheckoutRaces(clientId, eventId);
  const raceParticipants = await findUserRaceParticipants(clientId, eventId);

  if (raceParticipants && raceParticipants?.length !== 0) {
    return redirect(
      `/checkout/${
        raceParticipants[0].status === 'checkout'
          ? 'info'
          : raceParticipants[0].status === 'pending'
          ? 'payment'
          : 'confirmation'
      }/${eventId}`
    );
  }

  if (!event) {
    return redirect('/');
  }

  const races = await findEventRacesCheckoutQtd(eventId, clientId);

  return json({
    event,
    races,
    userCheckoutRaces
  });
};

export default function CheckoutTicketsRoute() {
  const { event, races, userCheckoutRaces } = useLoaderData<LoaderData>();

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
        <div className="flex-col w-full md:w-[50%]">
          {races
            .sort((a: Race, b: Race) => a.displayOrder - b.displayOrder)
            .map((r: RaceQtd) => (
              <DisplayRace race={r} key={r.id} />
            ))}
        </div>
        <div className="w-full mt-8 md:w-[50%] md:mt-0 md:pl-48">
          <DisplayCart cart={userCheckoutRaces} event={event} />
        </div>
      </div>
    </Main>
  );
}

function DisplayRace({ race }: { race: RaceQtd }) {
  const { t } = useTranslation('checkout');
  const raceTime = displayTimeOfDay(race.startTime);

  return (
    <div className="flex flex-col mt-8 w-full">
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

        <div className="flex flex-row items-center dark:text-blueGray-500 w-[80px] justify-between">
          <Form method="post">
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
          </Form>

          <H6
            className="dark:text-blueGray-500"
            data-cy={`race-${race.id}-qtd`}
          >
            {race.qtd}
          </H6>
          <Form method="post">
            <input type="hidden" name="raceId" value={race.id as string} />
            <button
              id={`add-race-${race.id}`}
              type="submit"
              className="w-[24px] h-[24px]"
              name="actionId"
              value={actions.add}
            >
              <ChevronUpIcon className="md:h-6 w-6 m-0 inline-block" />
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}

export function DisplayCart({ cart, event }: { cart: Cart[]; event: Event }) {
  const { t } = useTranslation('checkout');
  let totalPrice = 0;

  return (
    <Form method="post">
      <div className="flex flex-col border-2 border-b border-gray-500 rounded-md w-full h-full p-8 lg:p-12 md:ml-4">
        <H4>{t('Your Tickets')}</H4>
        <div className="mt-4 space-y-1">
          <H5>{event.name}</H5>
          <H6 className="dark:text-blueGray-500">
            <DisplayDate date={new Date(event.startAt as Date)} />
          </H6>
        </div>
        {cart
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((ticket, index: number) => (
            <div
              className="flex flex-col mt-8 w-full"
              key={ticket.id + ' - ' + index}
            >
              <div className="flex flex-row items-center justify-between">
                <H6>{ticket.raceName}</H6>
                <H6>{'x' + ticket.qtd}</H6>
              </div>
              <div className="flex flex-row items-center justify-between">
                <H6 className="dark:text-blueGray-500">
                  {ticket.racePrice + '€'}
                </H6>
                <H6 className="dark:text-blueGray-500">
                  {ticket.racePrice * ticket.qtd + '€'}
                </H6>
              </div>
            </div>
          ))}

        {cart.length !== 0 &&
          cart.map((c) => {
            totalPrice += c.racePrice * c.qtd;

            return totalPrice;
          }) && (
            <div className="flex flex-row items-center justify-between mt-4 py-4 border-t-2 border-grey-300">
              <H6>{t('Total')}</H6>
              <H6>{totalPrice + '€'}</H6>
            </div>
          )}

        <Button
          type="submit"
          name="actionId"
          value={actions.checkout}
          disabled={cart.length === 0}
          className="mt-4"
          id="checkout"
        >
          {t('Checkout now')}
        </Button>
      </div>
    </Form>
  );
}
