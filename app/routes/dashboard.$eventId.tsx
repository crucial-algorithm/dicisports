import type { LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useLoaderData } from '@remix-run/react';
import {
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

import { requireUser } from '~/server/auth/session.server';
import { findEvent } from '~/server/db/events.server';
import { findRaceParticipants } from '~/server/db/dashboard.server';
import DisplayImg from '~/components/shared/DisplayImg';
import { H2, H3, H4, H5, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import I18nText from '~/components/I18nText';
import Main from '~/components/shared/Main';
import type {
  Event,
  Race,
  RaceParticipant,
  RaceRevenueRegistrations
} from '~/types';

import WhenListEmpty from '~/components/shared/Empty';
import { findRevenueAndRegistrationsPerRace } from '~/server/db/races.server';

type LoaderData = {
  event: Event;
  racesRevenueAndRegistrations: RaceRevenueRegistrations[];
  raceParticipants: RaceParticipant[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const eventId = params.eventId;

  const event = (await findEvent(eventId as string)) as Event;
  const racesRevenueAndRegistrations = await findRevenueAndRegistrationsPerRace(
    eventId as string
  );

  if (!event) {
    return redirect('/');
  }

  if (event.createdById !== user.id) {
    return redirect('/');
  }

  return json({
    event,
    racesRevenueAndRegistrations,
    raceParticipants: await findRaceParticipants(event.races as Race[])
  });
};

export default function DashboardRoute() {
  const { event, racesRevenueAndRegistrations, raceParticipants } =
    useLoaderData<LoaderData>();
  const { t } = useTranslation('dashboard');

  const [lat, lng] = event.location.split(',');
  let minPrice = 0;

  const sortedRaces = event.races
    .sort((a: Race, b: Race) => a.price - b.price)
    .map((a: Race) => a.price);

  minPrice = sortedRaces[0];

  function EventInformation() {
    return (
      <div className="flex flex-auto flex-col ml-4">
        <div className="flex flex-row items-center mb-2">
          <CalendarDaysIcon className="h-6 w-6 m-0 inline-block text-primary" />
          <H6 data-cy="date" className="ml-4 md:ml-2">
            <DisplayDate date={new Date(event.startAt)} />
          </H6>
        </div>
        <div className="flex flex-row items-center mb-2">
          <MapPinIcon className="h-6 w-6 m-0 inline-block text-primary" />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`}
            target="_blank"
            rel="noreferrer"
            data-cy="location-link"
          >
            <H6 className="ml-4 mr-2 md:ml-2" data-cy="location">
              {event.address}
            </H6>
          </a>
        </div>
        <div className="flex flex-row items-center mb-2">
          <ArrowTrendingUpIcon className="h-6 w-6 m-0 inline-block text-primary" />
          <H6 data-cy="difficulty" className="ml-4 md:ml-2">
            <I18nText text={event.difficulty.name} />
          </H6>
        </div>
        <div className="flex flex-col justify-start mt-16">
          <H6 className="md:ml-2">{t('From')}</H6>
          <H2 data-cy="price" className="text-sp-light-blue-900 w-full md:ml-2">
            <b className="break-words">{`${
              minPrice ? minPrice : t('Undefined')
            }€`}</b>
          </H2>
        </div>
      </div>
    );
  }

  function EventStats() {
    let registrations = 0;
    let revenue = 0;

    racesRevenueAndRegistrations.map(
      (r: RaceRevenueRegistrations) => (registrations += r.registrations)
    );
    racesRevenueAndRegistrations.map(
      (r: RaceRevenueRegistrations) => (revenue += r.revenue)
    );

    return (
      <div className="flex flex-col items-center text-center gap-y-2">
        <div className="flex-col">
          <H6>{t('Registrations')}</H6>
          <H4>
            <b>{registrations}</b>
          </H4>
        </div>

        <div className="flex-col">
          <H6>{t('Revenue')}</H6>
          <H4>
            <b>{revenue + '€'}</b>
          </H4>
        </div>

        <div className="flex-col">
          <H6>{t('Clicks')}</H6>
          <H4>
            <b>{raceParticipants.length}</b>
          </H4>
        </div>
      </div>
    );
  }

  return (
    <Main>
      <div className="flex flex-row justify-start mb-2">
        <H2 className="text-sp-light-blue-900 mb-8">
          <b data-cy="name" className="break-words w-full">
            {event.name}
          </b>
        </H2>
      </div>

      <div className="flex flex-col md:flex-row mt-4 mb-8">
        <div className="w-full md:w-144">
          <DisplayImg
            dataCy="image0"
            imageId={event.image1}
            className="w-[500px]"
            transformations={{
              resize: {
                type: 'fill',
                width: 400,
                height: 400
              }
            }}
          />
        </div>

        <div className="flex flex-row justify-between w-full">
          <EventInformation />
          <EventStats />
        </div>
      </div>

      <H3>{t('Race Stats')}</H3>
      <div className="flex flex-col mt-2 scroll-mx-2 items-center md:items-start md:flex-row md:flex-nowrap md:overflow-x-auto pb-10 hide-scrollbar">
        {racesRevenueAndRegistrations.map((r: RaceRevenueRegistrations) => (
          <DisplayRaceStats
            name={r.name}
            registrations={r.registrations}
            revenue={r.revenue}
            key={r.id}
          />
        ))}
        <WhenListEmpty list={racesRevenueAndRegistrations}>
          <H6
            className="text-center p-12"
            variant="secondary"
            as="p"
            data-cy="no-stats"
          >
            {t('No Stats')}
          </H6>
        </WhenListEmpty>
      </div>

      <div className="flex flex-col">
        <div className="overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 inline-block min-w-full sm:px-6 lg:px-8">
            <div className="overflow-hidden">
              <table className="table-auto min-w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-sm font-medium text-black dark:text-white px-6 py-4 text-left">
                      {t('Athlete')}
                    </th>
                    <th className="text-sm font-medium text-black dark:text-white px-6 py-4 text-left">
                      {t('Team')}
                    </th>
                    <th className="text-sm font-medium text-black dark:text-white px-6 py-4 text-left">
                      {t('Age Group')}
                    </th>
                    <th className="text-sm font-medium text-black dark:text-white px-6 py-4 text-left">
                      {t('Booking Date')}
                    </th>
                    <th className="text-sm font-medium text-black dark:text-white px-6 py-4 text-left">
                      {t('Status')}
                    </th>
                    <th className="text-sm font-medium text-black dark:text-white px-6 py-4 text-left">
                      {t('Dorsal')}
                    </th>
                    <th className="text-sm font-medium text-black dark:text-white px-6 py-4 text-left">
                      {t('Race')}
                    </th>
                  </tr>
                </thead>
                <tbody>{/*table*/}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Main>
  );
}

function DisplayRaceStats({
  name,
  registrations,
  revenue
}: {
  name: string;
  registrations: number;
  revenue: number;
}) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex flex-col mr-4" data-cy="race">
      <div className="gap-y-2 text-center items-center border border-black dark:border-white rounded-2xl outline-offset-1 w-[280px] md:overflow-hidden">
        <div className="mt-4">
          <H4>{name}</H4>
        </div>
        <div className="mt-4">
          <H4>{t('Registrations')}</H4>
          <H5 className="dark:text-blueGray-500">{`${registrations}`}</H5>
        </div>
        <div className="my-4">
          <H4>{t('Revenue')}</H4>
          <H5 className="dark:text-blueGray-500">{revenue + '€'}</H5>
        </div>
      </div>
    </div>
  );
}
