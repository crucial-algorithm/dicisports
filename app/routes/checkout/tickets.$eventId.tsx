import type { ActionFunction, LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { Form, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

import Main from '~/components/shared/Main';
import { findEvent } from '~/server/db/events.server';
import { H2, H4, H5, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import type { Event, Race, Ticket } from '~/types';
import { findEventRaces, findRace } from '~/server/db/races.server';
import { displayTimeOfDay } from '~/utils/misc';
import Button from '~/components/shared/Button';
import { getClientSession } from '~/server/auth/client.server';
import {
  addTicket,
  getUserTickets,
  removeTicket
} from '~/server/db/checkout.server';

type LoaderData = {
  event: Event;
  races: Race[];
  selectedRace: Race | null;
  clientId: string;
};

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const clientSession = await getClientSession(request);

  const clientId = clientSession.getClientId();
  const actionId = form.get('actionId') as string;
  const raceId = form.get('raceId') as string;

  if (actionId === 'add') {
    return await addTicket(clientId, raceId);
  }

  if (actionId === 'remove') {
    return await removeTicket(clientId, raceId);
  }
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const clientSession = await getClientSession(request);
  const clientId = clientSession.getClientId();

  const url = new URL(request.url);
  const selectedRaceId = url.searchParams.get('selectedRace');

  const eventId = params.eventId as string;
  const event = await findEvent(eventId);

  if (!event) {
    return redirect('/');
  }

  const races = await findEventRaces(eventId);

  return json({
    event,
    races,
    selectedRace: selectedRaceId
      ? await findRace(selectedRaceId as string)
      : null,
    userTickets: await getUserTickets(clientId)
  });
};

export default function CheckoutTicketsRoute() {
  const { event, races, selectedRace } = useLoaderData<LoaderData>();

  const [cart, setCart] = useState<Ticket[]>(
    selectedRace ? [{ race: selectedRace, numberOfTickets: 1 }] : []
  );
  const [totalPrice, setTotalPrice] = useState<number>(
    selectedRace ? selectedRace.price : 0
  );

  function handleAddToCart(ticket: Ticket) {
    const index = cart.findIndex((t) => {
      return t.race.id === ticket.race.id;
    });

    if (index !== -1) {
      const newCart = [...cart];
      const newPrice = totalPrice + ticket.race.price;

      newCart[index].numberOfTickets = ticket.numberOfTickets;

      setCart(newCart);
      setTotalPrice(newPrice);
    } else {
      const newPrice = totalPrice + ticket.race.price;

      setCart([...cart, ticket]);
      setTotalPrice(newPrice);
    }
  }

  function handleRemoveFromCart(ticket: Ticket) {
    const newCart = [...cart];
    const index = cart.findIndex((t) => {
      return t.race.id === ticket.race.id;
    });
    const racePrice = cart[index].race.price;

    if (cart[index].numberOfTickets !== 1) {
      newCart[index].numberOfTickets -= 1;

      setCart(newCart);
    } else {
      newCart.splice(index, 1);

      setCart(newCart);
    }

    if (totalPrice >= racePrice) {
      const newPrice = totalPrice - racePrice;

      setTotalPrice(newPrice);
    } else {
      setTotalPrice(0);
    }
  }

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
      <div className="flex flex-row">
        <div className="flex-col w-[50%]">
          {races
            .sort((a: Race, b: Race) => a.displayOrder - b.displayOrder)
            .map((r: Race) =>
              selectedRace && r.id === selectedRace.id ? (
                <DisplayRace
                  race={r}
                  key={r.id}
                  addToCart={handleAddToCart}
                  removeFromCart={handleRemoveFromCart}
                  selectedRace={selectedRace}
                />
              ) : (
                <DisplayRace
                  race={r}
                  key={r.id}
                  addToCart={handleAddToCart}
                  removeFromCart={handleRemoveFromCart}
                />
              )
            )}
        </div>
        <div className="w-[50%] pl-48">
          <Cart cart={cart} event={event} totalPrice={totalPrice} />
        </div>
      </div>
    </Main>
  );
}

function DisplayRace({
  race,
  addToCart,
  removeFromCart,
  selectedRace
}: {
  race: Race;
  addToCart: (ticket: Ticket) => void;
  removeFromCart: (ticket: Ticket) => void;
  selectedRace?: Race;
}) {
  const { t } = useTranslation('checkout');
  const raceTime = displayTimeOfDay(race.startTime);
  const [numberOfTickets, setNumberOfTickets] = useState<number>(
    selectedRace ? 1 : 0
  );

  function handleAddTicket() {
    const next = numberOfTickets + 1;

    setNumberOfTickets(next);
    addToCart({ race: race, numberOfTickets: next });
  }

  function handleRemoveTicket() {
    const previous = numberOfTickets - 1;

    if (numberOfTickets > 0) {
      setNumberOfTickets(previous);
      removeFromCart({ race: race, numberOfTickets: previous });
    }
  }

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
            <input type="hidden" name="actionId" value="remove" />
            <input type="hidden" name="raceId" value={race.id as string} />
            <button
              type="submit"
              className="w-[24px] h-[24px]"
              name={`remove-ticket-${race.id}`}
            >
              <ChevronDownIcon className="md:h-6 w-6 m-0 inline-block" />
            </button>
          </Form>

          <H6 className="dark:text-blueGray-500">{numberOfTickets}</H6>
          <Form method="post">
            <input type="hidden" name="actionId" value="add" />
            <input type="hidden" name="raceId" value={race.id as string} />
            <button
              type="submit"
              className="w-[24px] h-[24px]"
              name={`add-ticket-${race.id}`}
            >
              <ChevronUpIcon className="md:h-6 w-6 m-0 inline-block" />
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}

function Cart({
  cart,
  event,
  totalPrice
}: {
  cart: Ticket[];
  event: Event;
  totalPrice: number;
}) {
  const { t } = useTranslation('checkout');

  return (
    <div className="flex flex-col border-2 border-b border-gray-500 rounded-md w-full h-full p-12 ml-4">
      <H4>{t('Your Tickets')}</H4>
      <div className="mt-4 space-y-1">
        <H5>{event.name}</H5>
        <H6 className="dark:text-blueGray-500">
          <DisplayDate date={new Date(event.startAt as Date)} />
        </H6>
      </div>
      {cart.map((ticket, index: number) => (
        <div
          className="flex flex-col mt-8 w-full"
          key={ticket.race.id + ' - ' + index}
        >
          <div className="flex flex-row items-center justify-between">
            <H6>{ticket.race.name}</H6>
            <H6>{'x' + ticket.numberOfTickets}</H6>
          </div>
          <div className="flex flex-row items-center justify-between">
            <H6 className="dark:text-blueGray-500">
              {ticket.race.price + '€'}
            </H6>
            <H6 className="dark:text-blueGray-500">
              {ticket.race.price * ticket.numberOfTickets + '€'}
            </H6>
          </div>
        </div>
      ))}

      {cart.length !== 0 && (
        <div className="flex flex-row items-center justify-between mt-4 py-4 border-t-2 border-grey-300">
          <H6>{t('Total')}</H6>
          <H6>{totalPrice + '€'}</H6>
        </div>
      )}

      <Button type="button" disabled={cart.length === 0} className="mt-4">
        {t('Checkout now')}
      </Button>
    </div>
  );
}
