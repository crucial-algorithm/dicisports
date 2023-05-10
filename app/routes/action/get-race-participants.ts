import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

import { findEvent } from '~/server/db/events.server';
import { NotFound } from '~/server/utils/misc';
import type { KCDHandle } from '~/types';
import i18n from '~/server/i18n.server';
import { findEventRaceParticipants } from '~/server/db/participant.server';

export const handle: KCDHandle & { id: string; i18n: string[] } = {
  id: 'dashboard',
  i18n: ['dashboard']
};

export const loader: LoaderFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'dashboard');
  const url = new URL(request.url);
  const eventId = url.searchParams.get('e') as string;

  // Only returns participants who are confirmed or waiting on payment
  const raceParticipants = await findEventRaceParticipants(eventId);

  return json(raceParticipants);
};
