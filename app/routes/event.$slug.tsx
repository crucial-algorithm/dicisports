import type { LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import type { FetcherWithComponents } from '@remix-run/react';
import { Form, Link, useFetcher, useLoaderData } from '@remix-run/react';
import type { TFunction } from 'i18next';

import type { User } from '@prisma/client';
import { Status } from '@prisma/client';
import {
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  HeartIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as Favorite } from '@heroicons/react/24/solid';
import * as React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Carousel } from 'react-responsive-carousel';
import clsx from 'clsx';
import { InView } from 'react-intersection-observer';

import CopyToClipboard from '~/components/shared/CopyToClipboard';

import {
  findEventBySlug,
  findUserFavoriteEvent
} from '~/server/db/events.server';

import Main from '~/components/shared/Main';
import { H2, H3, H4, H5, H6, Paragraph } from '~/components/shared/typography';
import Button, { ButtonLink } from '~/components/shared/Button';
import { getUser } from '~/server/auth/session.server';
import { Notification } from '~/components/shared/NotificationMessage';
import DisplayImg from '~/components/shared/DisplayImg';
import type { Document, Event, Organiser, Perk, Race, TranslationObject } from '~/types';
import { findEventRaces } from '~/server/db/races.server';
import DisplayDate from '~/components/shared/DIsplayDate';
import { displayTimeOfDay } from '~/utils/misc';
import { findEventPerks } from '~/server/db/perks.server';
import WhenListEmpty from '~/components/shared/Empty';
import I18nText from '~/components/I18nText';
import { findOrganiser } from '~/server/db/organiser.server';

type LoaderData = {
  event: Event;
  isUserFavorite: boolean;
  races: Race[];
  organiser?: Organiser;
};

const actions = {
  add: 'add',
  remove: 'remove'
};

export async function loadDisplayEventData(
  user: User | null,
  event: Event | null
) {
  let organiser: Organiser | null = null;
  let isUserFavorite = false;

  if (user && event) {
    isUserFavorite = !!(await findUserFavoriteEvent(user.id, event.id));
  }

  if (event) {
    organiser = await findOrganiser(event.createdById);
  }

  const eventId = event?.id as string;
  const races = await findEventRaces(eventId);

  return json({
    event: event,
    isUserFavorite,
    races,
    perks: await findEventPerks(eventId),
    organiser: organiser && organiser.status !== 'PENDING' ? organiser : null
  });
}

export const loader: LoaderFunction = async ({ params, request }) => {
  const user = await getUser(request);
  const slug = params.slug as string;

  if (!slug) {
    redirect('/');
  }

  const event = await findEventBySlug(slug);

  return loadDisplayEventData(
    user,
    event?.status === Status.published ? event : null
  );
};

export default function EventDisplayRoute() {
  const favorite = useFetcher();
  const { event, isUserFavorite, races, perks, organiser } = useLoaderData<LoaderData>();
  const { t } = useTranslation('event');

  let minPrice = 0;
  const [visiblePriceTag, setVisiblePriceTag] = useState<boolean>(true);

  if (!event) {
    return (
      <Main>
        <Paragraph data-cy="event-not-found">{t('Event not found')}</Paragraph>
        <a href="/">{t('Event not found action')}</a>
      </Main>
    );
  }

  if (races) {
    const sortedRaces = races
      .sort((a: Race, b: Race) => a.price - b.price)
      .map((a: Race) => a.price);

    minPrice = sortedRaces[0];
  }

  return (
    <>
      {!visiblePriceTag && (
        <StickyPriceTag
          eventName={event.name as string}
          minPrice={minPrice}
          t={t}
        />
      )}

      <Main>
        <PriceTag
          event={event}
          favorite={favorite}
          minPrice={minPrice}
          setVisiblePriceTag={setVisiblePriceTag}
          t={t}
          isUserFavorite={isUserFavorite}
        />
        <div className="my-8">
          <H3>{t('About')}</H3>
          <div
            className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2 whitespace-pre-line"
            data-cy="description"
          >
            {event.description ? (
              event.description
            ) : (
              <H6
                className="text-center p-12"
                variant="secondary"
                as="p"
                data-cy="no-description"
              >
                {t('No Description')}
              </H6>
            )}
          </div>
        </div>

        <H3 id="races-list">{t('Races')}</H3>
        <div
          data-cy="races-list"
          className="flex flex-col mt-2 scroll-mx-2 items-center md:items-start md:flex-row md:flex-nowrap md:overflow-x-auto pb-10 hide-scrollbar"
        >
          {races
            .sort((a: Race, b: Race) => a.displayOrder - b.displayOrder)
            .map((race: Race, index: number) => (
              <DisplayRace race={race} key={race.id} index={index} />
            ))}
          <WhenListEmpty list={races}>
            <H6
              className="text-center p-12"
              variant="secondary"
              as="p"
              data-cy="no-races"
            >
              {t('No Races')}
            </H6>
          </WhenListEmpty>
        </div>

        <div className="my-8">
          <H3>{t('Perks')}</H3>
          <div className="grid grid-rows-8 md:grid-rows-6 md:grid-flow-col gap-y-4 md:gap-y-2 my-2">
            {perks
              .sort((a: Perk, b: Perk) => a.displayOrder - b.displayOrder)
              .map((p: Perk, index: number) => (
                <div
                  key={p.id}
                  className="flex items-center mb-1"
                  data-cy="perk"
                >
                  <input
                    disabled
                    type="checkbox"
                    defaultChecked={p.isEnabled}
                    className="w-4 h-4 text-indigo-500 bg-gray-100 rounded border-gray-300 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                    name={`perk-checkbox-${p.id}`}
                  />
                  <label
                    htmlFor={p.id}
                    className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                    data-cy={`perk-${index}`}
                  >
                    {p.name}
                  </label>
                </div>
              ))}
          </div>
        </div>

        {event.directions && (
          <div className="my-8">
            <H3>{t('How to get there')}</H3>
            <div
              data-cy="directions"
              className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2 whitespace-pre-line"
            >
              {event.directions}
            </div>
          </div>
        )}

        <H3>{t('Documents')}</H3>
        <div
          data-cy="documents-list"
          className="flex flex-row flex-wrap mb-8 mt-2"
        >
          {event.documents
            .sort((a: Document, b: Document) => a.position - b.position)
            .map((document: Document, index: number) => (
              <DisplayDocument
                document={document}
                key={document.id}
                index={index}
              />
            ))}
          <WhenListEmpty list={event.documents}>
            <H6
              className="text-center p-12"
              variant="secondary"
              as="p"
              data-cy="no-documents"
            >
              {t('No Documents')}
            </H6>
          </WhenListEmpty>
        </div>
        {organiser && <OrganiserFooter organiser={organiser} />}
      </Main>
    </>
  );
}

function DisplayRace(props: { race: Race; index: number }) {
  const { race, index } = props;
  const { t } = useTranslation('event');
  const raceTime = displayTimeOfDay(race.startTime);
  const [expanded, setExpanded] = useState<boolean>(false);

  function handleSeeMore() {
    expanded ? setExpanded(false) : setExpanded(true);
  }

  return (
    <div className="flex flex-col" data-cy="race">
      <div
        className="gap-y-2 mb-4 mr-2 md:mr-4 text-center items-center border border-black dark:border-white rounded-2xl outline-offset-1 w-[340px] md:overflow-hidden"
        data-cy={`race-${index}`}
      >
        <div className="mt-4">
          <H4 data-cy={`race-name-${race.id}`}>{race.name}</H4>
        </div>
        <div className="mt-4">
          <H4>{t('Race Distance')}</H4>
          <H5
            className="dark:text-blueGray-500"
            data-cy={`race-distance-${race.id}`}
          >{`${race.distance} km`}</H5>
        </div>
        <div className="mt-4">
          <H4>{t('Race Start Time')}</H4>
          <H5
            className="dark:text-blueGray-500"
            data-cy={`race-time-${race.id}`}
          >
            {raceTime}
          </H5>
        </div>
        <div className={clsx('mt-4', expanded ? 'mb-0' : 'mb-2')}>
          <H4>{t('Race Price')}</H4>
          <H5
            className="dark:text-blueGray-500"
            data-cy={`race-price-${race.id}`}
          >{`€${race.price}`}</H5>
        </div>
        {expanded && (
          <>
            {race.raceDescription && (
              <div className="mt-4">
                <H4>{t('Description')}</H4>
                <div
                  className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2 whitespace-pre-line px-4"
                  data-cy={`race-description-${race.id}`}
                >
                  {race.raceDescription}
                </div>
              </div>
            )}
            <div className="mt-4">
              <H4>{t('Elevation Gain')}</H4>
              <div
                className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2"
                data-cy={`elevation-gain-${race.id}`}
              >
                {`${race.elevationGain} m`}
              </div>
            </div>
            {race.elevationLoss && (
              <div className="mt-4">
                <H4>{t('Elevation Loss')}</H4>
                <div
                  className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2"
                  data-cy={`elevation-loss-${race.id}`}
                >
                  {`${race.elevationLoss} m`}
                </div>
              </div>
            )}
            {race.track && (
              <Link
                to={`/o/race/gpx/${race.id}`}
                target="_blank"
                rel="noreferrer"
                data-cy={`gpx-${race.id}`}
                download
              >
                <H4 className="my-4 dark:text-blueGray-500">{t('GPX')}</H4>
              </Link>
            )}
          </>
        )}
        <div className="dark:text-blueGray-500 text-sm font-medium mt-4">
          <label
            role="button"
            onClick={handleSeeMore}
            data-cy={`see-more-${race.id}`}
          >
            {expanded ? t('See Less') : t('See More')}
          </label>
        </div>
        <div className="my-4">
          <Form method="get" action="/checkout/create">
            <input type="hidden" value={race.id} name="raceId" />
            <input type="hidden" value={race.eventId} name="eventId" />
            <Button name={`race-${race.id}`}>{t('Book')}</Button>
          </Form>
        </div>
      </div>
    </div>
  );
}

function DisplayDocument(props: { document: Document; index: number }) {
  const { document, index } = props;
  const path = document.path;
  const fileExtension = path.split('.');

  return (
    <div
      className="flex items-center border border-black dark:border-white rounded-2xl h-16 p-4 mr-2 mb-2"
      data-cy={`document-${index}`}
    >
      <div
        className="dark:text-white font-medium border-2 border-secondary bg-primary rounded-full p-2 mr-2"
        data-cy="document-extension"
      >
        {fileExtension[fileExtension.length - 1].toUpperCase()}
      </div>
      <a
        href={`/o/document/${document.id}`}
        target="_blank"
        rel="noreferrer"
        className="text-black dark:text-white"
        data-cy="document-label"
      >
        {document.label}
      </a>
    </div>
  );
}

function PriceTag({
  event,
  favorite,
  minPrice,
  setVisiblePriceTag,
  t,
  isUserFavorite
}: {
  event: Event;
  favorite: FetcherWithComponents<any>;
  minPrice: number;
  setVisiblePriceTag: Dispatch<SetStateAction<boolean>>;
  t: TFunction;
  isUserFavorite: boolean;
}) {
  const favoriteAddedMessage = t('Favorite Added');
  const favoriteRemovedMessage = t('Favorite Removed');
  const copiedToClipMessage = t('Copied to Clipboard');

  const [isFavorite, setIsFavorite] = useState<boolean>(isUserFavorite);
  const [message, setMessage] = useState<string>(favoriteAddedMessage);
  const [address, setAddress] = useState<string>('');
  let showFavoriteAddedNotification: any = null;
  let showCopiedToClipboardNotification: any = null;

  const images: string[] = [
    event.image1,
    event.image2,
    event.image3,
    event.image4,
    event.image5
  ].filter(Boolean) as string[];

  function handlerSetShowNotificationFunction(callback: () => void) {
    showFavoriteAddedNotification = callback;
  }

  function handlerSetShowNotificationCopyToClipboard(callback: () => void) {
    showCopiedToClipboardNotification = callback;
  }

  function handlerClickToCopy() {
    showCopiedToClipboardNotification();
  }

  function cleanStatus() {
    return '';
  }

  useEffect(() => {
    if (favorite.type === 'actionReload' && favorite.data.ok) {
      setMessage(
        favorite.data.action === actions.add
          ? favoriteAddedMessage
          : favoriteRemovedMessage
      );
      setIsFavorite(favorite.data.action === actions.add);
      showFavoriteAddedNotification();
    }

    const url = new URL(window.location.href);

    setAddress(url.origin);
  }, [
    favorite,
    showFavoriteAddedNotification,
    favoriteAddedMessage,
    favoriteRemovedMessage
  ]);

  return (
    <InView onChange={setVisiblePriceTag}>
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

        <div className="flex flex-auto flex-col mt-4 ml-4">
          <div className="flex flex-row justify-end mb-2">
            <H2 className="text-sp-light-blue-900 mb-8 w-[calc(100%-(40px+40px+8px))]">
              <b data-cy="name" className="break-words w-full">
                {event.name}
              </b>
            </H2>
            <favorite.Form
              method="post"
              action={`/o/event/fav/${event.id}`}
            >
              {isFavorite ? (
                <Button
                  size="tiny"
                  name="action"
                  value={actions.remove}
                  className="w-[40px] h-[40px]"
                >
                  <Favorite className="h-6 w-6 m-0 inline-block" />
                </Button>
              ) : (
                <Button
                  size="tiny"
                  name="action"
                  value={actions.add}
                  className="w-[40px] h-[40px]"
                >
                  <HeartIcon className="h-6 w-6 m-0 inline-block" />
                </Button>
              )}
            </favorite.Form>
            <CopyToClipboard
              text={`${address}/event/${event.slug}`}
              id={event.id}
              successMessage={handlerClickToCopy}
              className="w-[40px] h-[40px] ml-2"
            />
            <Notification show={handlerSetShowNotificationFunction}>
              {message}
            </Notification>
            <Notification show={handlerSetShowNotificationCopyToClipboard}>
              {copiedToClipMessage}
            </Notification>
          </div>
          <div className="flex flex-row items-center mb-2">
            <CalendarDaysIcon className="h-6 w-6 m-0 inline-block text-primary" />
            <H6 data-cy="date" className="ml-4 md:ml-2">
              <DisplayDate date={new Date(event.startAt || 0)} />
            </H6>
          </div>
          <div className="flex flex-row items-center mb-2">
            <MapPinIcon className="h-6 w-6 m-0 inline-block text-primary" />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${event.lat}%2C${event.lng}`}
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
              <I18nText text={event.difficulty?.name as TranslationObject} />
            </H6>
          </div>
          <div className="flex flex-row justify-between items-center mt-16 dark:bg-gray-900 bg-white">
            <div className="flex flex-col justify-start">
              <H6 className="md:ml-2">{t('From')}</H6>
              <H2
                data-cy="price"
                className="text-sp-light-blue-900 w-full md:ml-2"
              >
                <b className="break-words">{`${
                  minPrice ? minPrice : t('Undefined')
                }€`}</b>
              </H2>
            </div>
            <ButtonLink to="#races-list">{t('Races Anchor')}</ButtonLink>
          </div>
        </div>
      </div>
    </InView>
  );
}

function StickyPriceTag({
  eventName,
  minPrice,
  t
}: {
  eventName: string;
  minPrice: number;
  t: TFunction;
}) {
  return (
    <div className="flex flex-row justify-between items-center mt-16 top-0 p-4 sticky dark:bg-gray-900 bg-white dark:border-gray-500 drop-shadow-md z-10">
      <H3 data-cy="price" className="text-sp-light-blue-900 w-full md:ml-2">
        <b className="break-words">{eventName}</b>
      </H3>
      <div className="flex flex-col md:flex-row items-center">
        <div className="flex flex-col md:justify-start">
          <H6 className="md:ml-2">{t('From')}</H6>
          <H2 data-cy="price" className="text-sp-light-blue-900 w-full md:ml-2">
            <b className="break-words">{`${minPrice}€`}</b>
          </H2>
        </div>
        <ButtonLink className="md:ml-16" to="#races-list">
          {t('Races Anchor')}
        </ButtonLink>
      </div>
    </div>
  );
}

function OrganiserFooter({ organiser }: { organiser: Organiser }) {
  return (
    <footer data-cy="organiser-profile">
      <div className="container px-4 mx-auto">
        <div className="-mx-4 flex flex-wrap">
          <div className="px-4 my-4 w-full">
            <div className="flex flex-row gap-x-2 items-center">
              <div className="w-14 h-14">
                <DisplayImg imageId={organiser.logo} />
              </div>
              <H4 data-cy="organiser-name">{organiser.name}</H4>
            </div>

            <div className="mt-4 whitespace-pre-wrap max-w-[90ch] dark:text-blueGray-500 text-gray-500 text-base break-words">
              {organiser.description}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
