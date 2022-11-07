import type { LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { Link, useFetcher, useLoaderData } from '@remix-run/react';

import { Status } from '@prisma/client';
import {
  CalendarDaysIcon,
  HeartIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as Favorite, ShareIcon } from '@heroicons/react/24/solid';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Carousel } from 'react-responsive-carousel';
import clsx from 'clsx';
import handleViewport from 'react-in-viewport';

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
import type { Document, Event, Perk, Race } from '~/types';
import { findEventRaces } from '~/server/db/races.server';
import DisplayDate from '~/components/shared/DIsplayDate';
import { displayTimeOfDay } from '~/utils/misc';
import { findEventPerks } from '~/server/db/perks.server';
import WhenListEmpty from '~/components/shared/Empty';

type LoaderData = {
  event: Event;
  isUserFavorite: boolean;
  races: Race[];
};

const actions = {
  add: 'add',
  remove: 'remove'
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const user = await getUser(request);
  const slug = params.slug as string;
  let isUserFavorite = false;
  let isPublished = false;

  if (!slug) {
    redirect('/');
  }

  const event = await findEventBySlug(slug);

  if (event?.status === Status.published) {
    isPublished = true;
  }

  if (user && event) {
    isUserFavorite = !!(await findUserFavoriteEvent(user.id, event.id));
  }

  const eventId = event?.id as string;
  const races = await findEventRaces(eventId);

  return json({
    event: isPublished ? event : null,
    isUserFavorite,
    races,
    perks: await findEventPerks(eventId)
  });
};

export default function EventDisplayRoute() {
  const favorite = useFetcher();
  const { event, isUserFavorite, races, perks } = useLoaderData<LoaderData>();
  const { t } = useTranslation('event');

  const favoriteAddedMessage = t('Favorite Added');
  const favoriteRemovedMessage = t('Favorite Removed');
  const copiedToClipMessage = t('Copied to Clipboard');

  const [isFavorite, setIsFavorite] = useState<boolean>(isUserFavorite);
  const [message, setMessage] = useState<string>(favoriteAddedMessage);
  const [address, setAddress] = useState<string>('');
  let showFavoriteAddedNotification: any = null;
  let showCopiedToClipboardNotification: any = null;
  let minPrice = 0;
  const [visiblePriceTag, setVisiblePriceTag] = useState<boolean>(true);

  function Price() {
    return <PriceTag />;
  }

  function PriceTag() {
    return (
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
              action={`/organizer/event/fav/${event.id}`}
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
              text={`${address}/group/${event.slug}`}
              onCopy={handlerClickToCopy}
            >
              <Button
                size="tiny"
                className="w-[40px] h-[40px] ml-2"
                name="share"
              >
                <ShareIcon className="h-6 w-6 m-0 inline-block" />
              </Button>
            </CopyToClipboard>
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
              <DisplayDate date={new Date(event.startAt)} />
            </H6>
          </div>
          <div className="flex flex-row items-center">
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
          <div className="flex flex-row justify-between items-center mt-16 dark:bg-gray-900 bg-white">
            <div className="flex flex-col justify-start">
              <H6 className="md:ml-2">{t('From')}</H6>
              <H2
                data-cy="price"
                className="text-sp-light-blue-900 w-full md:ml-2"
              >
                <b className="break-words">{`${minPrice}€`}</b>
              </H2>
            </div>
            <ButtonLink to="#races-list">{t('Races Anchor')}</ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  function StickyPriceTag() {
    return (
      <div className="flex flex-row justify-between items-center mt-16 top-0 p-4 sticky dark:bg-gray-900 bg-white dark:border-gray-500 drop-shadow-md z-10">
        <H3 data-cy="price" className="text-sp-light-blue-900 w-full md:ml-2">
          <b className="break-words">{event.name}</b>
        </H3>
        <div className="flex flex-col md:flex-row items-center">
          <div className="flex flex-col md:justify-start">
            <H6 className="md:ml-2">{t('From')}</H6>
            <H2
              data-cy="price"
              className="text-sp-light-blue-900 w-full md:ml-2"
            >
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

  const EventHeader = handleViewport(Price);

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

  function handleEventHeaderLeaveViewport() {
    setVisiblePriceTag(false);
  }

  function handleEventHeaderInViewport() {
    setVisiblePriceTag(true);
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

  const images: string[] = [
    event.image1,
    event.image2,
    event.image3,
    event.image4,
    event.image5
  ].filter(Boolean) as string[];
  const [lat, lng] = event.location.split(',');

  return (
    <>
      {!visiblePriceTag && <StickyPriceTag />}

      <Main>
        <EventHeader
          onEnterViewport={handleEventHeaderInViewport}
          onLeaveViewport={handleEventHeaderLeaveViewport}
        />
        <div className="my-8">
          <H3>{t('About')}</H3>
          <div
            className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2 whitespace-pre-line"
            data-cy="description"
          >
            {event.eventDescription}
          </div>
        </div>

        <H3 id="races-list">{t('Races')}</H3>
        <div
          data-cy="races-list"
          className="flex flex-col mt-2 scroll-mx-2 items-center md:items-start md:flex-row md:flex-nowrap md:overflow-x-auto pb-10 hide-scrollbar"
        >
          {races
            .sort((a: Race, b: Race) => a.displayOrder - b.displayOrder)
            .map((race: Race) => (
              <DisplayRace race={race} key={race.id} />
            ))}
          <WhenListEmpty list={races}>
            <H6 className="text-center p-12" variant="secondary" as="p">
              {t('No Races')}
            </H6>
          </WhenListEmpty>
        </div>

        <div className="my-8">
          <H3>{t('Perks')}</H3>
          <div className="grid grid-rows-8 md:grid-rows-6 md:grid-flow-col gap-y-4 md:gap-y-2 my-2">
            {perks
              .sort((a: Perk, b: Perk) => a.displayOrder - b.displayOrder)
              .map((p: Perk) => (
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
            .map((document: Document) => (
              <DisplayDocument document={document} key={document.id} />
            ))}
        </div>
      </Main>
    </>
  );
}

function DisplayRace(props: { race: Race }) {
  const { race } = props;
  const { t } = useTranslation('event');
  const raceTime = displayTimeOfDay(race.startTime);
  const [expanded, setExpanded] = useState<boolean>(false);

  function handleSeeMore() {
    expanded ? setExpanded(false) : setExpanded(true);
  }

  return (
    <div className="flex flex-col" data-cy="race">
      <div className="gap-y-2 mb-4 mr-2 md:mr-4 text-center items-center border border-black dark:border-white rounded-2xl outline-offset-1 w-[340px] md:overflow-hidden">
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
                to={`/organizer/race/gpx/${race.id}`}
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
          <Button name="book">{t('Book')}</Button>
        </div>
      </div>
    </div>
  );
}

function DisplayDocument(props: { document: Document }) {
  const { document } = props;
  const path = document.path;
  const fileExtension = path.split('.');

  return (
    <div className="flex items-center border border-black dark:border-white rounded-2xl h-16 p-4 mr-2 mb-2">
      <div
        className="dark:text-white font-medium border-2 border-secondary bg-primary rounded-full p-2 mr-2"
        data-cy="document-extension"
      >
        {fileExtension[fileExtension.length - 1].toUpperCase()}
      </div>
      <a
        href={`/organizer/document/${document.id}`}
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
