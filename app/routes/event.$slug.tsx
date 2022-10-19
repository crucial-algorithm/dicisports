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
import { H2, H3, H6 } from '~/components/shared/typography';
import ButtonGroup from '~/components/shared/ButtonGroup';
import Button from '~/components/shared/Button';
import { getUser } from '~/server/auth/session.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';
import i18n from '~/server/i18n.server';
import { Notification } from '~/components/shared/NotificationMessage';
import DisplayImg from '~/components/shared/DisplayImg';
import type { Event } from '~/types';
import { findEventRaces } from '~/server/db/races.server';
import DisplayDate from '~/components/shared/DIsplayDate';

type LoaderData = {
  event: Event;
  isUserFavorite: boolean;
  minPrice: number;
  maxPrice: number;
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
    maxPrice
  });
};

export default function EventDisplayRoute() {
  const favorite = useFetcher();
  const { event, isUserFavorite, minPrice, maxPrice } =
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
      <div className="flex flex-row justify-between h-[40px] mb-4">
        <H2 className="text-sp-light-blue-900 mb-4 w-[calc(100%-(40px+4px))]">
          <b className="break-words">{event.name}</b>
        </H2>
        <ButtonGroup density="compact">
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
            <Button size="tiny" className="w-[40px] h-[40px] ml-4">
              <ShareIcon className="h-6 w-6 m-0 inline-block" />
            </Button>
          </CopyToClipboard>
          <Notification show={handlerSetShowNotificationFunction}>
            {message}
          </Notification>
          <Notification show={handlerSetShowNotificationCopyToClipboard}>
            {copiedToClipMessage}
          </Notification>
        </ButtonGroup>
      </div>

      {/*When the size of the screen is < 640px we display a carousel of images*/}
      {/*To do that we use md:hidden and on the carousel w-full*/}
      <div className="hidden m-auto md:flex-wrap md:flex flex-row justify-begin gap-4 md:grid-flow-col md:grid-rows-1">
        {event.image1 ? (
          <DisplayImg
            id={event.image1}
            dontMessWithImgSize={true}
            className="w-full md:w-[400px] md:h-[400px]"
          />
        ) : null}
        {event.image2 ? (
          <DisplayImg
            id={event.image2}
            dontMessWithImgSize={true}
            className="w-full md:w-[400px] md:h-[400px]"
          />
        ) : null}
        {event.image3 ? (
          <DisplayImg
            id={event.image3}
            dontMessWithImgSize={true}
            className="w-full md:w-[400px] md:h-[400px]"
          />
        ) : null}
        {event.image4 ? (
          <DisplayImg
            id={event.image4}
            dontMessWithImgSize={true}
            className="w-full md:w-[400px] md:h-[400px]"
          />
        ) : null}
        {event.image5 ? (
          <DisplayImg
            id={event.image5}
            dontMessWithImgSize={true}
            className="w-full md:w-[400px] md:h-[400px]"
          />
        ) : null}
      </div>

      <div className="w-full mt-16 md:hidden">
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

      <div className="flex flex-col mt-4 md:flex-row md:justify-between md:mt-8">
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

      <div className="mt-8">
        <H3>{t('About')}</H3>
        <div className="dark:text-blueGray-500 text-sm font-medium mr-2">
          {event.eventDescription}
        </div>
      </div>
    </Main>
  );
}
