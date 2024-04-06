import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as Favorite } from '@heroicons/react/24/solid';
import { useFetcher } from '@remix-run/react';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import EventEntry from '~/components/EventEntry';
import Button from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';
import CopyToClipboard from '~/components/shared/CopyToClipboard';
import { Notification } from '~/components/shared/NotificationMessage';
import { fetcherType } from '~/utils/misc';
import type { SearchEventResult } from '~/server/db/search.server';

export default function EventResult({
  event,
  img,
  isUserFavorite
}: {
  event: SearchEventResult;
  img?: string;
  userLocation: [number, number] | null;
  showLocation: boolean;
  isUserFavorite: boolean;
}) {
  const { t, i18n } = useTranslation('organizer');
  const favorite = useFetcher();

  const favoriteAddedMessage = t('Favorite Added');
  const favoriteRemovedMessage = t('Favorite Removed');
  const copiedToClipMessage = t('Copied to Clipboard');

  const [isFavorite, setIsFavorite] = useState<boolean>(isUserFavorite);
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
    const typeOfFetcher = fetcherType(favorite);
    const favoriteData = favorite.data as
      | { ok: boolean; action: string }
      | undefined;

    if (typeOfFetcher === 'actionReload' && favoriteData) {
      if (favoriteData.ok && favoriteData.action) {
        setMessage(
          favoriteData.action === 'add'
            ? favoriteAddedMessage
            : favoriteRemovedMessage
        );
        setIsFavorite(favoriteData.action === 'add');
        showFavoriteAddedNotification();
      }
    }

    const url = new URL(window.location.href);

    setAddress(url.origin);
  }, [
    favorite,
    showFavoriteAddedNotification,
    favoriteAddedMessage,
    favoriteRemovedMessage
  ]);

  function stopPropagation(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <>
      <EventEntry
        event={event}
        img={img}
        actions={
          <ButtonGroup density="compact">
            <CopyToClipboard
              text={`${address}/${i18n.language}/event/${event.slug}`}
              id={event.id}
              className="w-12"
              successMessage={handlerClickToCopy}
            />
            <favorite.Form method="post" action={`/fav/${event.id}`}>
              {isFavorite ? (
                <Button
                  size="tiny"
                  name="action"
                  value="remove"
                  id="remove-favorite"
                  className="w-12"
                  onClick={stopPropagation}
                >
                  <Favorite className="h-6 w-6 m-0 inline-block" />
                </Button>
              ) : (
                <Button
                  size="tiny"
                  name="action"
                  value="add"
                  className="w-12"
                  onClick={stopPropagation}
                >
                  <HeartIcon className="h-6 w-6 m-0 inline-block" />
                </Button>
              )}
            </favorite.Form>
            <Notification show={handlerSetShowNotificationFunction}>
              {message}
            </Notification>
            <Notification show={handlerSetShowNotificationCopyToClipboard}>
              {copiedToClipMessage}
            </Notification>
          </ButtonGroup>
        }
      />
    </>
  );
}
