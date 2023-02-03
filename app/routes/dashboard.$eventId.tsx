import type { LoaderFunction } from 'remix';
import * as React from 'react';

import { json, redirect } from 'remix';
import { useTranslation } from 'react-i18next';
import { useLoaderData } from '@remix-run/react';
import {
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

import { Carousel } from 'react-responsive-carousel';

import { requireUser } from '~/server/auth/session.server';
import { findEvent } from '~/server/db/events.server';
import { findRevenueAndRegistrationsPerRace } from '~/server/db/dashboard.server';
import DisplayImg from '~/components/shared/DisplayImg';
import { H2, H4, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import I18nText from '~/components/I18nText';
import Main from '~/components/shared/Main';
import type { Race, RaceRevenueRegistrations } from '~/types';

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const eventId = params.eventId;

  const event = await findEvent(eventId as string);
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
    racesRevenueAndRegistrations
  });
};

export default function DashboardRoute() {
  const { event, racesRevenueAndRegistrations } = useLoaderData();
  const { t } = useTranslation('dashboard');

  const images: string[] = [
    event.image1,
    event.image2,
    event.image3,
    event.image4,
    event.image5
  ].filter(Boolean) as string[];
  const [lat, lng] = event.location.split(',');
  let minPrice = 0;

  const sortedRaces = event.races
    .sort((a: Race, b: Race) => a.price - b.price)
    .map((a: Race) => a.price);

  minPrice = sortedRaces[0];

  function cleanStatus() {
    return '';
  }

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
            <b>{registrations + '/200'}</b>
          </H4>
        </div>

        <div className="flex-col">
          <H6>{t('Revenue')}</H6>
          <H4>
            <b>{revenue + '€'}</b>
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

      <div className="flex flex-col md:flex-row mt-4">
        <div className="w-full md:w-144">
          {images.length > 1 ? (
            <Carousel statusFormatter={cleanStatus}>
              {images.map((image, idx) => (
                <DisplayImg
                  key={idx}
                  dataCy={`image${idx}`}
                  imageId={image}
                  className="w-[500px]"
                  transformations={{
                    resize: {
                      type: 'fill',
                      width: 400,
                      height: 400
                    }
                  }}
                />
              ))}
            </Carousel>
          ) : (
            <DisplayImg
              dataCy="image0"
              imageId={images[0]}
              className="w-[500px]"
              transformations={{
                resize: {
                  type: 'fill',
                  width: 400,
                  height: 400
                }
              }}
            />
          )}
        </div>

        <div className="flex flex-row justify-between w-full">
          <EventInformation />
          <EventStats />
        </div>
      </div>
    </Main>
  );
}
