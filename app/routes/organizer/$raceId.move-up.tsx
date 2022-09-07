import type { ActionFunction } from 'remix';
import { json } from 'remix';

import {
  findEventRaces,
  findRace,
  updateDisplayOrderUp
} from '~/server/db/races.server';
import type { Race } from '~/types';
import { badRequest } from '~/utils/misc';
import i18n from '~/server/i18n.server';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const raceId = params.raceId as string;
  const current = await findRace(raceId);

  if (!current) {
    return badRequest({ error: t('No Race') });
  }

  const eventId = current.eventId as string;
  const races: Array<Race> = (await findEventRaces(eventId)) as Race[];

  const position = races.findIndex((r) => r.id === raceId);
  const previous = races[position - 1];

  await updateDisplayOrderUp(current, previous);

  return json({});
};
