import type { LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

import Main from '~/components/shared/Main';
import { findEvent } from '~/server/db/events.server';
import { H2, H4, H5, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import type { Event, Race, Ticket } from '~/types';
import { findEventRaces } from '~/server/db/races.server';
import { displayTimeOfDay } from '~/utils/misc';
import Button from '~/components/shared/Button';

type LoaderData = {
  event: Event;
  races: Race[];
};

export const loader: LoaderFunction = async ({ params }) => {
  const eventId = params.eventId as string;

  const event = await findEvent(eventId);

  if (!event) {
    return redirect('/');
  }

  const races = await findEventRaces(eventId);

  return json({
    event,
    races
  });
};

export default function CheckoutRoute() {
  const { t } = useTranslation('checkout');
  const { event, races } = useLoaderData<LoaderData>();

  const [cart, setCart] = useState<Ticket[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  function handleAddToCart(ticket: Ticket) {
    const index = cart.findIndex((obj) => {
      return obj.race.id === ticket.race.id;
    });

    if (index !== -1) {
      const newArr = [...cart];
      const newPrice = totalPrice + ticket.race.price;

      newArr[index].numberOfTickets = ticket.numberOfTickets;

      setCart(newArr);
      setTotalPrice(newPrice);
    } else {
      const newPrice = totalPrice + ticket.race.price;

      setCart([...cart, ticket]);
      setTotalPrice(newPrice);
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
            .map((r: Race) => (
              <DisplayRace race={r} key={r.id} addToCart={handleAddToCart} />
            ))}
        </div>
        <div className="w-[50%] pl-48">
          <div className="flex flex-col border-2 border-b border-gray-500 rounded-md w-full h-full p-12 ml-4">
            <H4>{t('Your Tickets')}</H4>
            <div className="mt-4 space-y-1">
              <H5>{event.name}</H5>
              <H6 className="dark:text-blueGray-500">
                <DisplayDate date={new Date(event.startAt as Date)} />
              </H6>
            </div>
            {cart.map((t, index: number) => (
              <Cart ticket={t} key={index + ' - ' + t.race.id} />
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
        </div>
      </div>
    </Main>
  );
}

function DisplayRace({
  race,
  addToCart
}: {
  race: Race;
  addToCart: (ticket: Ticket) => void;
}) {
  const { t } = useTranslation('checkout');
  const raceTime = displayTimeOfDay(race.startTime);
  const [numberOfTickets, setNumberOfTickets] = useState<number>(0);

  function handleAddTicket() {
    const next = numberOfTickets + 1;

    setNumberOfTickets(next);
    addToCart({ race: race, numberOfTickets: next });
  }

  function handleRemoveTicket() {
    if (numberOfTickets !== 0) {
      setNumberOfTickets(numberOfTickets - 1);
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
          <button
            type="button"
            onClick={handleRemoveTicket}
            className="w-[24px] h-[24px]"
            name={`remove-ticket-${race.id}`}
          >
            <ChevronDownIcon className="md:h-6 w-6 m-0 inline-block" />
          </button>
          <H6 className="dark:text-blueGray-500">{numberOfTickets}</H6>
          <button
            type="button"
            onClick={handleAddTicket}
            className="w-[24px] h-[24px]"
            name={`remove-ticket-${race.id}`}
          >
            <ChevronUpIcon className="md:h-6 w-6 m-0 inline-block" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Cart({ ticket }: { ticket: Ticket }) {
  const ticketsPrice = ticket.race.price * ticket.numberOfTickets;

  return (
    <div className="flex flex-col mt-8 w-full">
      <div className="flex flex-row items-center justify-between">
        <H6>{ticket.race.name}</H6>
        <H6>{'x' + ticket.numberOfTickets}</H6>
      </div>
      <div className="flex flex-row items-center justify-between">
        <H6 className="dark:text-blueGray-500">{ticket.race.price + '€'}</H6>
        <H6 className="dark:text-blueGray-500">{ticketsPrice + '€'}</H6>
      </div>
    </div>
  );
}
