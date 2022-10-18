import type { LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { useFetcher, useLoaderData } from '@remix-run/react';

import { Status } from '@prisma/client';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as Favorite, ShareIcon } from '@heroicons/react/24/solid';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CopyToClipboard from 'react-copy-to-clipboard';

import {
  findEventBySlug,
  findUserFavoriteEvents
} from '~/server/db/events.server';

import Main from '~/components/shared/Main';
import { H2 } from '~/components/shared/typography';
import ButtonGroup from '~/components/shared/ButtonGroup';
import Button from '~/components/shared/Button';
import { getUser } from '~/server/auth/session.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';
import i18n from '~/server/i18n.server';
import { Notification } from '~/components/shared/NotificationMessage';

type LoaderData = {
  event: Event;
  isUserFavorite: boolean;
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

  return json({
    event,
    isUserFavorite
  });
};

export default function EventDisplayRoute() {
  const favorite = useFetcher();
  const { event, isUserFavorite } = useLoaderData<LoaderData>();
  const { t } = useTranslation('home');

  const favoriteAddedMessage = t('Favorite Added');
  const favoriteRemovedMessage = t('Favorite Removed');
  const copiedToClipMessage = t('Copied to Clipboard');

  const [message, setMessage] = useState<string>(favoriteAddedMessage);
  const [address, setAddress] = useState<string>('');
  let showFavoriteAddedNotification: any = null;
  let showCopiedToClipboardNotification: any = null;

  function handlerSetShowNotificationFunction(callback: () => void) {
    showFavoriteAddedNotification = callback;
  }

  function handlerSetShowNotificationCopyToClipboard(callback: () => void) {
    showCopiedToClipboardNotification = callback;
  }

  function handlerClickToCopy() {
    showCopiedToClipboardNotification();
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
      <div className="flex flex-row justify-between h-[40px]">
        <H2 className="text-sp-light-blue-900 mb-4">
          <b>{event.name}</b>
        </H2>
        <ButtonGroup density="compact">
          <favorite.Form
            method="post"
            action={`/organizer/event/fav/${event.id}`}
          >
            {isUserFavorite ? (
              <Button size="tiny" name="action" value={actions.remove}>
                <Favorite className="h-6 w-6 m-0 inline-block" />
              </Button>
            ) : (
              <Button size="tiny" name="action" value={actions.add}>
                <HeartIcon className="h-6 w-6 m-0 inline-block" />
              </Button>
            )}
          </favorite.Form>
          <CopyToClipboard
            text={`${address}/group/${event.slug}`}
            onCopy={handlerClickToCopy}
          >
            <Button size="tiny">
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
    </Main>
  );
}
