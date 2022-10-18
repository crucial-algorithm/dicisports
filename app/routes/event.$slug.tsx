import type { LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { useFetcher, useLoaderData } from '@remix-run/react';

import { Status } from '@prisma/client';
import { HeartIcon } from '@heroicons/react/24/outline';
import { ShareIcon, HeartIcon as Favorite } from '@heroicons/react/24/solid';

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

  console.log('isUserFavorite --->', isUserFavorite);
  return json({
    event,
    isUserFavorite
  });
};

export default function EventDisplayRoute() {
  const favorite = useFetcher();
  const { event, isUserFavorite } = useLoaderData<LoaderData>();

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
          <Button size="tiny">
            <ShareIcon className="h-6 w-6 m-0 inline-block" />
          </Button>
        </ButtonGroup>
      </div>
    </Main>
  );
}
