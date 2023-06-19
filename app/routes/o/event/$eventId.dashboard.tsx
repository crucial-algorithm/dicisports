import type { LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import * as React from 'react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, useLoaderData } from '@remix-run/react';
import {
  ArrowDownTrayIcon,
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

import Button, { ButtonLink } from '~/components/shared/Button';
import SearchField from '~/components/shared/SearchField';

import { requireUser } from '~/server/auth/session.server';
import { findEvent } from '~/server/db/events.server';
import DisplayImg from '~/components/shared/DisplayImg';
import { H2, H3, H4, H5, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import I18nText from '~/components/I18nText';
import Main from '~/components/shared/Main';
import type {
  Event,
  KCDHandle,
  Race,
  RaceRevenueRegistrations,
  TranslationObject,
  UIRaceParticipant
} from '~/types';
import {
  findRegistrationsAddedToCart,
  findRevenueAndRegistrationsPerRace
} from '~/server/db/races.server';
import { findRaceParticipants } from '~/server/db/participant.server';
import exportRaceParticipantsToExcel from '~/utils/ExportParticipants';
import ScrollToTop from '~/components/ScrollToTop';

type LoaderData = {
  event: Event;
  racesRevenueAndRegistrations: RaceRevenueRegistrations[];
  raceParticipants: UIRaceParticipant[];
  totalRaceParticipants: number;
  pageNumber: number;
  statsPerRace: Array<{ id: string; total: number }>;
  searchedName: string;
};

const actionsId = {
  nextPage: 'nextPage',
  previousPage: 'previousPage'
};

export const handle: KCDHandle & { id: string; i18n: string[] } = {
  id: 'dashboard',
  i18n: ['dashboard']
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const eventId = params.eventId as string;
  const { searchParams } = new URL(request.url);
  let page = searchParams.get('page')?.length
    ? Number(searchParams.get('page'))
    : 0;

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

  const searchedName = searchParams.get('searched-name');

  // In order to make pagination work on Cypress, we are now doing it server side
  const actionId = searchParams.get('actionId');
  const setPage = searchParams.get('set-page');

  // If user presses next/previous page button
  if (actionId) {
    if (actionId === actionsId.nextPage) {
      page += 1;
    }

    if (actionId === actionsId.previousPage) {
      page -= 1;
    }
  }

  // If user presses specific page button
  if (setPage?.length) {
    page = Number(setPage);
  }

  const { results, total } = await findRaceParticipants(
    eventId,
    page,
    10,
    searchedName?.length ? searchedName : null
  );

  return json({
    event,
    racesRevenueAndRegistrations,
    raceParticipants: results,
    totalRaceParticipants: total,
    statsPerRace: await findRegistrationsAddedToCart(eventId),
    pageNumber: page,
    searchedName: searchedName || ''
  });
};

export default function DashboardRoute() {
  const {
    event,
    racesRevenueAndRegistrations,
    raceParticipants,
    totalRaceParticipants,
    pageNumber,
    statsPerRace,
    searchedName
  } = useLoaderData<LoaderData>() as LoaderData;
  const { t } = useTranslation('dashboard');
  const searchForm = useRef<HTMLFormElement>(null);
  const [searchedParticipantName, setSearchedParticipantName] =
    useState<string>(searchedName);
  const [lat, lng] = event?.location?.split(',') || [0, 0];
  let minPrice = 0;
  let totalClicks = 0;
  const numberOfPages = Math.ceil(totalRaceParticipants / 10);
  const main = window.document.querySelector('#organizer-main-container');

  const sortedRaces = event.races
    .sort((a: Race, b: Race) => a.price - b.price)
    .map((a: Race) => a.price);

  statsPerRace.map((r) => (totalClicks += r.total));
  minPrice = sortedRaces[0];

  function handleSearchedName(value: string) {
    setSearchedParticipantName(value);
    searchForm?.current?.submit();
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
              {event.location}
            </H6>
          </a>
        </div>
        <div className="flex flex-row items-center mb-2">
          <ArrowTrendingUpIcon className="h-6 w-6 m-0 inline-block text-primary" />
          <H6 data-cy="difficulty" className="ml-4 md:ml-2">
            <I18nText text={event?.difficulty?.name as TranslationObject} />
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

  async function handleExportParticipants() {
    const res = await fetch(`/action/get-race-participants?e=${event.id}`);
    const raceParticipants = await res.json();
    const eventName = (event.name as string).replace(/\s/g, '_');

    await exportRaceParticipantsToExcel({
      raceParticipants,
      fileName: `${eventName}_${t('Participants')}`,
      t
    });
  }

  return (
    <Main>
      <ScrollToTop element={main as Element} />

      <div className="flex flex-row justify-between mb-8 w-full">
        <H2 className="text-sp-light-blue-900">
          <b data-cy="name" className="break-words w-full">
            {event.name}
          </b>
        </H2>
        <ButtonLink
          to={`/o/event/${event.id}`}
          size="small"
          className="w-28"
          data-cy="edit"
        >
          {t('Edit')}
        </ButtonLink>
      </div>

      <div className="flex flex-col gap-y-2 md:flex-row mt-4 mb-8">
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
      <div className="flex flex-col mt-2 scroll-mx-2 items-center gap-y-2 md:items-start md:flex-row md:flex-nowrap md:overflow-x-auto pb-10 hide-scrollbar">
        {racesRevenueAndRegistrations.map((r: RaceRevenueRegistrations) => (
          <DisplayRaceStats
            name={r.name}
            registrations={r.registrations}
            revenue={r.revenue}
            clicks={statsPerRace.find((cr) => cr.id === r.id)?.total || 0}
            key={r.id}
          />
        ))}
      </div>

      <Form method="get" preventScrollReset={true} ref={searchForm}>
        <div className="flex flex-col gap-y-4 md:flex-row md:justify-between items-center">
          <Button
            name="export-participants"
            type="button"
            onClick={handleExportParticipants}
            variant="secondary"
            size="small"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
            {t('Export Participants')}
          </Button>

          <SearchField
            name="searched-name"
            placeholder={t('Search Placeholder')}
            onChange={handleSearchedName}
            defaultValue={searchedName}
            className="text-sm"
          />
        </div>
      </Form>

      <Form method="get" preventScrollReset={true}>
        <input type="hidden" value={pageNumber} name="page" />

        {searchedName.length > 0 && (
          <input
            type="hidden"
            value={searchedParticipantName}
            name="searched-name"
          />
        )}

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
                        data-cy="participant-row"
                        id={`participant-${rp.id}`}
                      >
                        <TD value={`${rp.name}`} />
                        <TD value={rp.teamName ? rp.teamName : t('Individual')} />
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
                          // onClick={handlePreviousPage}
                          className="block px-3 py-2 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                          data-cy="previous-page"
                          name="actionId"
                          value={actionsId.previousPage}
                          disabled={pageNumber === 0}
                        >
                          <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                      </li>

                      {Array(numberOfPages)
                        .fill(0)
                        .map((r, index) => (
                          <li key={index}>
                            <button
                              id={String(index)}
                              className={clsx({
                                'px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white':
                                  index !== pageNumber,
                                'z-10 px-3 py-2 leading-tight text-blue-600 border border-blue-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white':
                                  index === pageNumber
                              })}
                              name="set-page"
                              value={index}
                              data-cy="page-number"
                            >
                              {index + 1}
                            </button>
                          </li>
                        ))}
                      <li>
                        <button
                          type="submit"
                          // onClick={handleNextPage}
                          className="block px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                          data-cy="next-page"
                          name="actionId"
                          value={actionsId.nextPage}
                          disabled={pageNumber + 1 === numberOfPages}
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
