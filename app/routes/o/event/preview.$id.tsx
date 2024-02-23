import type { LoaderFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { ButtonLink } from '~/components/shared/Button';
import { H6 } from '~/components/shared/typography';

import { getUser } from '~/server/auth/session.server';
import { findEventWithRacesAndDocuments } from '~/server/db/events.server';
import EventDisplayRoute, {
  loadDisplayEventData
} from '~/routes/($lang).event.$slug';

export const handle: { id: string; i18n: string[] } = {
  id: 'preview-event',
  i18n: ['event']
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const user = await getUser(request);
  const id = params.id as string;
  const event = await findEventWithRacesAndDocuments(id);

  return loadDisplayEventData(
    user,
    event?.createdById === user?.id ? event : null
  );
};

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
