import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as Favorite } from '@heroicons/react/24/solid';
import { useFetcher } from '@remix-run/react';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import GroupEntry from '~/components/GroupEntry';
import Button, { ButtonLink } from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';
import CopyToClipboard from '~/components/shared/CopyToClipboard';
import WhatsApp from '~/components/shared/icons/WhatsApp';
import { Notification } from '~/components/shared/NotificationMessage';
import type { Group, SearchResults } from '~/types';
import { fetcherType } from '~/utils/misc';

export default function GroupResult({
  group,
  img,
  isUserFavorite,
  favAddedMessage,
  favRemovedMessage,
  copiedToClipMessage,
  address,
  location,
  isLoggedIn,
  userLocation,
  showLocation
}: {
  group: SearchResults;
  img?: string;
  isUserFavorite: boolean;
  favAddedMessage: string;
  favRemovedMessage: string;
  copiedToClipMessage: string;
  address: string;
  location: string;
  isLoggedIn: boolean;
  userLocation: [number, number] | null;
  showLocation: boolean;
}) {
  const favorite = useFetcher();
  const ref = useRef();
  const [message, setMessage] = useState<string>(favAddedMessage);
  let showFavoriteAddedNotification: any = null;
  let showCopiedToClipboardNotification: any = null;

  function handlerSetShowNotificationFunction(callback: () => void) {
    showFavoriteAddedNotification = callback;
  }

  function handlerSetShowNotificationCopyToClipboard(callback: () => void) {
    showCopiedToClipboardNotification = callback;
  }

  function handlerShowURLCopiedMessage() {
    showCopiedToClipboardNotification();
  }

  useEffect(() => {
    const typeOfFetcher = fetcherType(favorite);
    const favoriteData = favorite.data as
      | { ok: boolean; action: string }
      | undefined;

    if (typeOfFetcher === 'done' && favoriteData) {
      if (favoriteData.ok && favoriteData.action) {
        if (ref.current) {
          (ref.current as HTMLFormElement).reset();
        }
        setMessage(
          favoriteData.action === 'add' ? favAddedMessage : favRemovedMessage
        );
        showFavoriteAddedNotification();
      }
    }
  }, [
    favorite,
    favAddedMessage,
    favRemovedMessage,
    showFavoriteAddedNotification
  ]);

  const whatsAppLink = isLoggedIn
    ? group.whatsapp || ''
    : `/login?a=ws&g=${group.id}&l=${location}`;

  function stopPropagation(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <>
      <GroupEntry
        group={group as Group}
        key={group.id}
        img={img}
        actions={
          <ButtonGroup density="compact">
            {group.whatsapp && (
              <ButtonLink
                size="tiny"
                type="button"
                to={whatsAppLink}
                id={`whatsapp-${group.id}`}
                onClick={stopPropagation}
              >
                <WhatsApp className="h-6 w-6 m-0 inline-block fill-white dark:fill-black" />
              </ButtonLink>
            )}
            <CopyToClipboard
              text={`${address}/group/${group.slug}`}
              id={group.id}
              successMessage={handlerShowURLCopiedMessage}
            />
            <favorite.Form
              // @ts-ignore
              ref={ref}
              method="post"
              action={`/g/group/fav/${group.id}`}
            >
              {isUserFavorite ? (
                <Button
                  size="tiny"
                  name="action"
                  value="remove"
                  id="remove-favorite"
                  onClick={stopPropagation}
                >
                  <Favorite className="h-6 w-6 m-0 inline-block" />
                </Button>
              ) : (
                <Button
                  size="tiny"
                  name="action"
                  value="add"
                  id={`add-favorite-${group.id}`}
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
        footer={
          <div
            className="font-medium text-gray-500 dark:text-white flex items-center justify-center"
            data-cy="distance"
          >
            {userLocation && showLocation && (
              <span>{Math.ceil(group.distance || 0)} km</span>
            )}
          </div>
        }
      />
    </>
  );
}
