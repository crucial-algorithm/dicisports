import type { ActionFunction } from 'remix';
import { redirect } from 'remix';

import {
  findEventRaces,
  findRace,
  updateDisplayOrderDown
} from '~/server/db/races.server';
import type { Race } from '~/types';
import i18n from '~/server/i18n.server';
import { badRequest } from '~/utils/misc';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const raceId = params.raceId as string;
  const current = await findRace(raceId);

  if (current) {
    const eventId = current.eventId;
    const races: Array<Race> = (await findEventRaces(eventId)) as Race[];

    const position = races.findIndex((r) => r.id === raceId);
    const next = races[position + 1];

    await updateDisplayOrderDown(current, next);

    return redirect(`/organizer/event/${eventId}`);
  }

  return badRequest({ error: t('No Race') });
};
