import type { LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { useFetcher, useLoaderData } from '@remix-run/react';

import { Status } from '@prisma/client';
import {
  CalendarDaysIcon,
  CurrencyEuroIcon,
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
import Button from '~/components/shared/Button';
import { getUser } from '~/server/auth/session.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';
import i18n from '~/server/i18n.server';
import { Notification } from '~/components/shared/NotificationMessage';
import DisplayImg from '~/components/shared/DisplayImg';
import type { Event, Race } from '~/types';
import { findEventRaces } from '~/server/db/races.server';
import DisplayDate from '~/components/shared/DIsplayDate';
import { timeOfDayToHoursMinutes } from '~/utils/misc';

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
  let maxPrice = 0;

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

  const races = await findEventRaces(event.id);

  if (races) {
    const sortedRaces = races
      .sort((a, b) => a.price - b.price)
      .map((a) => a.price);

    minPrice = sortedRaces[0];
    maxPrice = sortedRaces[races.length - 1];
  }

  return json({
    event,
    isUserFavorite,
    minPrice,
    maxPrice,
    races
  });
};

export default function EventDisplayRoute() {
  const favorite = useFetcher();
  const { event, isUserFavorite, minPrice, maxPrice, races } =
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

  let price = `${minPrice}€ - ${maxPrice}€`;

  if (minPrice === maxPrice) {
    price = `${minPrice}€`;
  }

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
          <H2 className="text-sp-light-blue-900 mb-4 w-full">
            <b className="break-words">{event.name}</b>
          </H2>
          <div className="flex flex-row items-center">
            <CalendarDaysIcon className="h-6 w-6 m-0 inline-block text-primary" />
            <H6 className="ml-4 md:ml-2">
              <DisplayDate date={new Date(event.startAt)} />
            </H6>
          </div>
          <div className="flex flex-row items-center">
            <CurrencyEuroIcon className="h-6 w-6 m-0 inline-block text-primary" />
            <H6 className="ml-4 md:ml-2">{price}</H6>
          </div>
          <div className="flex flex-row items-center">
            <MapPinIcon className="h-6 w-6 m-0 inline-block text-primary" />
            <H6 className="ml-4 md:ml-2">{event.address}</H6>
          </div>
        </div>
      </div>

      <div className="my-8">
        <H3>{t('About')}</H3>
        <div className="dark:text-blueGray-500 text-sm font-medium mr-2">
          {event.eventDescription}
        </div>
      </div>

      <H3>{t('Races')}</H3>
      <div className="flex flex-col mt-2 scroll-mx-2 md:flex-row">
        {races.map((race: Race) => (
          <DisplayRaces race={race} key={race.id} />
        ))}
      </div>
    </Main>
  );
}

function DisplayRaces(props: { race: Race }) {
  const { race } = props;
  const { t } = useTranslation('home');
  const [hour, minute] = timeOfDayToHoursMinutes(race.startTime);

  return (
    <div className="w-full flex flex-col gap-y-2 mb-4 md:mr-4 text-center items-center border border-white rounded-2xl outline-offset-1">
      <div className="mt-4">
        <H4>{race.name}</H4>
      </div>
      <div className="mt-4">
        <H4>{t('Race Distance')}</H4>
        <H5 className="text-blueGray-500">{`${race.distance} km`}</H5>
      </div>
      <div className="mt-4">
        <H4>{t('Race Start Time')}</H4>
        <H5 className="dark:text-blueGray-500">{`${hour}:${minute}`}</H5>
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
