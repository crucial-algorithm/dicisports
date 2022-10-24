import type { LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { useFetcher, useLoaderData } from '@remix-run/react';

import { Status } from '@prisma/client';
import {
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  HeartIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as Favorite, ShareIcon } from '@heroicons/react/24/solid';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CopyToClipboard from 'react-copy-to-clipboard';
import { Carousel } from 'react-responsive-carousel';

import {
  findEventBySlug,
  findUserFavoriteEvents
} from '~/server/db/events.server';

import Main from '~/components/shared/Main';
import { H2, H3, H4, H5, H6 } from '~/components/shared/typography';
import Button, { ButtonLink } from '~/components/shared/Button';
import { getUser } from '~/server/auth/session.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';
import i18n from '~/server/i18n.server';
import { Notification } from '~/components/shared/NotificationMessage';
import DisplayImg from '~/components/shared/DisplayImg';
import type { Event, Perk, Race, Document } from '~/types';
import { findEventRaces } from '~/server/db/races.server';
import DisplayDate from '~/components/shared/DIsplayDate';
import { displayTimeOfDay } from '~/utils/misc';
import { findEventPerks } from '~/server/db/perks.server';

type LoaderData = {
  event: Event;
  isUserFavorite: boolean;
  minPrice: number;
  maxPrice: number;
  races: Race[];
};

const actions = {
  add: 'add',
  remove: 'remove'
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const user = await getUser(request);
  const slug = params.slug as string;
  const t = await i18n.getFixedT(request, 'create-event-form');
  let isUserFavorite = false;
  let minPrice = 0;

  if (!slug) {
    redirect('/');
  }

  const event = await findEventBySlug(slug);

  if (!event) {
    throw NotFound(t('Event not found'));
  }

  if (event.status !== Status.published) {
    throw Unauthorized(t('Not authorized'));
  }

  if (user) {
    const userFavoriteEvents = await findUserFavoriteEvents(user?.id);

    userFavoriteEvents.map((a) => {
      if (a.id === event.id) {
        isUserFavorite = true;
      }

      return isUserFavorite;
    });
  }

  const eventId = event.id as string;
  const races = await findEventRaces(eventId);

  if (!races) {
    //TODO: shouldn't happen, but throw new error, maybe redirect if user === creator
    throw NotFound(t('Event not found'));
  }

  const sortedRaces = races
    .sort((a, b) => a.price - b.price)
    .map((a) => a.price);

  minPrice = sortedRaces[0];

  return json({
    event,
    isUserFavorite,
    minPrice,
    races,
    perks: await findEventPerks(eventId)
  });
};

export default function EventDisplayRoute() {
  const favorite = useFetcher();
  const { event, isUserFavorite, minPrice, races, perks } =
    useLoaderData<LoaderData>();
  const { t } = useTranslation('home');

  const favoriteAddedMessage = t('Favorite Added');
  const favoriteRemovedMessage = t('Favorite Removed');
  const copiedToClipMessage = t('Copied to Clipboard');

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
    <Main>
      <div className="flex flex-col md:flex-row mt-4">
        <div className="w-full md:w-144">
          <Carousel statusFormatter={cleanStatus}>
            {images.map((image, idx) => (
              <DisplayImg
                key={idx}
                id={image}
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
        </div>

        <div className="flex flex-auto flex-col mt-4 ml-4">
          <div className="flex flex-row justify-end mb-2">
            <favorite.Form
              method="post"
              action={`/organizer/event/fav/${event.id}`}
            >
              {isUserFavorite ? (
                <Button
                  size="tiny"
                  name="action"
                  value={actions.remove}
                  className="w-[40px] h-[40px] ml-4"
                >
                  <Favorite className="h-6 w-6 m-0 inline-block" />
                </Button>
              ) : (
                <Button
                  size="tiny"
                  name="action"
                  value={actions.add}
                  className="w-[40px] h-[40px] ml-4"
                >
                  <HeartIcon className="h-6 w-6 m-0 inline-block" />
                </Button>
              )}
            </favorite.Form>
            <CopyToClipboard
              text={`${address}/group/${event.slug}`}
              onCopy={handlerClickToCopy}
            >
              <Button size="tiny" className="w-[40px] h-[40px] ml-2">
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
          <H2 className="text-sp-light-blue-900 mb-8 w-full">
            <b className="break-words">{event.name}</b>
          </H2>
          <div className="flex flex-row items-center">
            <CalendarDaysIcon className="h-6 w-6 m-0 inline-block text-primary" />
            <H6 className="ml-4 md:ml-2">
              <DisplayDate date={new Date(event.startAt)} />
            </H6>
          </div>
          <div className="flex flex-row items-center">
            <MapPinIcon className="h-6 w-6 m-0 inline-block text-primary" />
            <H6 className="ml-4 md:ml-2">{event.address}</H6>
          </div>
          <div className="flex flex-row justify-between items-center mt-16">
            <div className="flex flex-col justify-start">
              <H6 className="md:ml-2">{t('From')}</H6>
              <H2 className="text-sp-light-blue-900 w-full md:ml-2">
                <b className="break-words">{`${minPrice}€`}</b>
              </H2>
            </div>
            <ButtonLink to="#races">{t('Races Anchor')}</ButtonLink>
          </div>
        </div>
      </div>

      <div className="my-8">
        <H3>{t('About')}</H3>
        <div className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2 whitespace-pre-line">
          {event.eventDescription}
        </div>
      </div>

      <H3 id="races">{t('Races')}</H3>
      <div className="flex flex-col mt-2 scroll-mx-2 md:flex-row md:overflow-x-scroll md:flex-nowrap">
        {races.map((race: Race) => (
          <DisplayRaces race={race} key={race.id} />
        ))}
      </div>

      <div className="my-8">
        <H3>{t('Perks')}</H3>
        <div className="grid grid-rows-8 md:grid-rows-6 md:grid-flow-col gap-y-4 md:gap-y-2 my-2">
          {perks
            .sort((a: Perk, b: Perk) => a.displayOrder - b.displayOrder)
            .map((p: any) => (
              <div key={p.id} className="flex items-center mb-1">
                <input
                  disabled
                  type="checkbox"
                  defaultChecked={p.isEnabled}
                  className="w-4 h-4 text-indigo-500 bg-gray-100 rounded border-gray-300 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
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
          <div className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2 whitespace-pre-line">
            {event.directions}
          </div>
        </div>
      )}

      <div className="my-8">
        <H3>{t('Documents')}</H3>
        {event.documents.map((document: Document) => (
          <DisplayDocument document={document} key={document.id} />
        ))}
      </div>
    </Main>
  );
}

function DisplayRaces(props: { race: Race }) {
  const { race } = props;
  const { t } = useTranslation('home');
  const raceTime = displayTimeOfDay(race.startTime);

  return (
    <div className=" flex flex-col gap-y-2 mb-4 mr-2 md:mr-4 text-center items-center border border-white rounded-2xl outline-offset-1 w-[340px] h-[402px]">
      <div className="mt-4">
        <H4>{race.name}</H4>
      </div>
      <div className="mt-4">
        <H4>{t('Race Distance')}</H4>
        <H5 className="dark:text-blueGray-500">{`${race.distance} km`}</H5>
      </div>
      <div className="mt-4">
        <H4>{t('Race Start Time')}</H4>
        <H5 className="dark:text-blueGray-500">{raceTime}</H5>
      </div>
      <div className="my-4">
        <H4>{t('Race Price')}</H4>
        <H5 className="dark:text-blueGray-500">{`€${race.price}`}</H5>
      </div>
      <div className="mb-4">
        <Button>{t('Book')}</Button>
      </div>
    </div>
  );
}

function DisplayDocument(props: { document: Document }) {
  const { document } = props;

  return (
    <div className="relative flex mb-4 justify-between items-center flex-row border-b p-4 last:border-none border-gray-300 dark:border-gray-300">
      <div className="text-lg text-left font-extrabold pl-3 dark:text-white w-[calc(100%-(24px+24px+24px))]">
        {document.label}
      </div>

      <a
        href={`/organizer/document/${document.id}`}
        target="_blank"
        rel="noreferrer"
      >
        <ArrowDownTrayIcon className="md:h-6 w-6 m-0 inline-block text-black dark:text-blueGray-500" />
      </a>
    </div>
  );
}
