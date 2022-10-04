import type { ActionFunction } from 'remix';
import { json } from 'remix';

import {
  findEventRaces,
  findRace,
  updateDisplayOrderDown
} from '~/server/db/races.server';
import type { Race } from '~/types';
import i18n from '~/server/i18n.server';
import { badRequest } from '~/utils/misc';
import { requireAdminUser } from '~/server/auth/session.server';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  // hide while this is still in dev
  await requireAdminUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const raceId = params.raceId as string;
  const race = await findRace(raceId);

  if (!race) {
    return badRequest({ error: t('No Race') });
  }

  const eventId = race.eventId;
  const races: Array<Race> = (await findEventRaces(eventId)) as Race[];

  const position = races.findIndex((r) => r.id === raceId);
  const next = races[position + 1];

  await updateDisplayOrderDown(race, next);

  return json({});
};
