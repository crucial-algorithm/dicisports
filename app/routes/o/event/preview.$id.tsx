import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { useTranslation } from 'react-i18next';

import type { Organizer, User, Event } from '@prisma/client';

import { ButtonLink } from '~/components/shared/Button';
import { H6 } from '~/components/shared/typography';

import { getUser } from '~/server/auth/session.server';
import { findEventWithRacesAndDocuments, findUserFavoriteEvent } from '~/server/db/events.server';
import EventDisplayRoute from '~/routes/($lang).event.$slug';
import { findOrganizer } from '~/server/db/organizer.server';
import { findEventRaces } from '~/server/db/races.server';
import { findEventPerks } from '~/server/db/perks.server';

export const handle: { id: string; i18n: string[] } = {
  id: 'preview-event',
  i18n: ['event']
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const user: Omit<User, 'password' | 'salt'> | null = await getUser(request);
  const id = params.id as string;
  const event = await findEventWithRacesAndDocuments(id);

  return loadDisplayEventData(
    user,
    event?.createdById === user?.id ? event : null
  );
};


async function loadDisplayEventData(
  user: Omit<User, 'password' | 'salt'> | null,
  event: Event | null
) {
  let organizer: Organizer | null = null;
  let isUserFavorite = false;

  if (user && event) {
    isUserFavorite = !!(await findUserFavoriteEvent(user.id, event.id));
  }

  if (event) {
    organizer = await findOrganizer(event.createdById);
  }

  const eventId = event?.id as string;
  const races = await findEventRaces(eventId);

  return json({
    event: event,
    isUserFavorite,
    races,
    perks: await findEventPerks(eventId),
    organizer: organizer && organizer.status !== 'PENDING' ? organizer : null
  });
}

export default function EventPreviewRoute() {
  const { event } = useLoaderData<typeof loader>();
  const { t } = useTranslation('event');

  return (
    <>
      <div>
        {event && (
          <header className="sticky top-0 z-10 bg-amber-300 dark:bg-amber-500 w-full h-20 flex items-center justify-between py-4 px-6">
            <H6>{t('You are in preview mode')}</H6>
            <ButtonLink to={`/o/event/${event.id}`} variant="secondary">
              {t('Edit')}
            </ButtonLink>
          </header>
        )}
        <EventDisplayRoute />
      </div>
    </>
  );
}
