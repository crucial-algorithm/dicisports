import type { LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, useLoaderData } from '@remix-run/react';
import {
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/20/solid';
import clsx from 'clsx';

import { requireUser } from '~/server/auth/session.server';
import { findEvent } from '~/server/db/events.server';
import DisplayImg from '~/components/shared/DisplayImg';
import { H2, H3, H4, H5, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import I18nText from '~/components/I18nText';
import Main from '~/components/shared/Main';
import type {
  Event,
  Race,
  RaceRevenueRegistrations,
  TranslationObject,
  UIRaceParticipant
} from '~/types';

import WhenListEmpty from '~/components/shared/Empty';
import {
  findRegistrationsAddedToCart,
  findRevenueAndRegistrationsPerRace
} from '~/server/db/races.server';
import { findRaceParticipants } from '~/server/db/participant.server';

type LoaderData = {
  event: Event;
  racesRevenueAndRegistrations: RaceRevenueRegistrations[];
  raceParticipants: UIRaceParticipant[];
  totalRaceParticipants: number;
  pageNumber: number;
  statsPerRace: Array<{ id: string; total: number }>;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const eventId = params.eventId as string;
  const { searchParams } = new URL(request.url);

  const event = (await findEvent(eventId)) as Event;
  const racesRevenueAndRegistrations = await findRevenueAndRegistrationsPerRace(
    eventId as string
  );

  if (!event) {
    return redirect('/');
  }

  if (event.createdById !== user.id) {
    return redirect('/');
  }

  const page = searchParams.get('page');
  const { results, total } = await findRaceParticipants(
    eventId,
    page?.length ? Number(page) : 0
  );

  return json({
    event,
    racesRevenueAndRegistrations,
    raceParticipants: results,
    totalRaceParticipants: total,
    statsPerRace: await findRegistrationsAddedToCart(eventId),
    pageNumber: Number(page) || 0
  });
};

export default function DashboardRoute() {
  const {
    event,
    racesRevenueAndRegistrations,
    raceParticipants,
    totalRaceParticipants,
    pageNumber,
    statsPerRace
  } = useLoaderData<LoaderData>() as LoaderData;
  const { t } = useTranslation('dashboard');

  const [page, setPage] = useState<number>(pageNumber || 0);
  const [lat, lng] = event?.location?.split(',') || [0, 0];
  let minPrice = 0;
  let totalClicks = 0;

  const sortedRaces = event.races
    .sort((a: Race, b: Race) => a.price - b.price)
    .map((a: Race) => a.price);

  statsPerRace.map((r) => (totalClicks += r.total));
  minPrice = sortedRaces[0];

  function handlePreviousPage() {
    if (page !== 0) {
      setPage(page - 1);
    }
  }

  function handleNextPage() {
    if ((page + 1) !== Math.ceil(totalRaceParticipants / 10)) {
      setPage(page + 1);
    }
  }

  function handleSetPage(e: React.MouseEvent) {
    setPage(Number(e.currentTarget.id));
  }

  function EventInformation() {
    return (
      <div className="flex flex-auto flex-col ml-4">
        <div className="flex flex-row items-center mb-2">
          <CalendarDaysIcon className="h-6 w-6 m-0 inline-block text-primary" />
          <H6 data-cy="date" className="ml-4 md:ml-2">
            <DisplayDate date={new Date(event?.startAt || 0)} />
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
            <I18nText text={event.difficulty.name as TranslationObject} />
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
            <b>{totalClicks}</b>
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
            clicks={statsPerRace.find((cr) => cr.id === r.id)?.total || 0}
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

      <Form method="get">
        <input type="hidden" value={page} name="page" />

        <div className="flex flex-col">
          <div className="overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 inline-block min-w-full sm:px-6 lg:px-8">
              <div className="overflow-hidden">
                <table className="table-auto min-w-full">
                  <thead className="border-b">
                    <tr>
                      <TH name={t('Athlete')} />
                      <TH name={t('Team')} />
                      <TH name={t('Age Group')} />
                      <TH name={t('Booking Date')} />
                      <TH name={t('Status')} />
                      <TH name={t('Dorsal')} />
                      <TH name={t('Race')} />
                    </tr>
                  </thead>
                  <tbody>
                    {raceParticipants.map((rp) => (
                      <tr
                        className="border-b transition duration-300 ease-in-out hover:bg-red"
                        key={rp.id}
                      >
                        <TD value={`${rp.name}`} />
                        <TD value={'-'} />
                        <TD value={rp.gender} />
                        <TD value={String(rp.bookingAt).split('T')[0]} />
                        <TD value={t(rp.status)} />
                        <TD value={'-'} />
                        <TD value={rp.raceName} />
                        <td>
                          <button
                            type="button"
                            className="w-[24px] h-[24px] dark:text-blueGray-500"
                          >
                            <EllipsisVerticalIcon className="md:h-6 w-6 m-0 inline-block" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end mt-2">
                  <nav aria-label="Page navigation example">
                    <ul className="inline-flex items-center -space-x-px">
                      <li>
                        <button
                          type="submit"
                          onClick={handlePreviousPage}
                          className="block px-3 py-2 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                        >
                          <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                      </li>

                      {Array(Math.ceil(totalRaceParticipants / 10))
                        .fill(0)
                        .map((r, index) => (
                          <li key={index}>
                            <button
                              id={String(index)}
                              onClick={handleSetPage}
                              className={clsx({
                                'px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white':
                                  index !== page,
                                'z-10 px-3 py-2 leading-tight text-blue-600 border border-blue-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white':
                                  index === page
                              })}
                            >
                              {index + 1}
                            </button>
                          </li>
                        ))}
                      <li>
                        <button
                          type="submit"
                          onClick={handleNextPage}
                          className="block px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                        >
                          <ChevronRightIcon className="h-5 w-5" />
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </Main>
  );
}

function TH({ name }: { name: string }) {
  return (
    <th className="text-sm font-medium text-black dark:text-white px-6 py-4 text-left">
      {name}
    </th>
  );
}

function TD({ value }: { value: string | null }) {
  return (
    <td className="text-sm text-black dark:text-white font-light px-6 py-4 whitespace-nowrap">
      {value}
    </td>
  );
}

function DisplayRaceStats({
  name,
  registrations,
  revenue,
  clicks
}: {
  name: string;
  registrations: number;
  revenue: number;
  clicks: number;
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
        <div className="my-4">
          <H4>{t('Added To Cart/ Clicks')}</H4>
          <H5 className="dark:text-blueGray-500">{clicks}</H5>
        </div>
      </div>
    </div>
  );
}
