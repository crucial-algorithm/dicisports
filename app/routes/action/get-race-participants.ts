import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

import type { KCDHandle } from '~/types';
import { findEventRaceParticipants } from '~/server/db/participant.server';

export const handle: KCDHandle & { id: string; i18n: string[] } = {
  id: 'dashboard',
  i18n: ['dashboard']
};

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const eventId = url.searchParams.get('e') as string;

  // Only returns participants who are confirmed or waiting on payment
  const raceParticipants = await findEventRaceParticipants(eventId);

  return json(raceParticipants);
};
