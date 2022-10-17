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
import { requireAdminUser, requireUser } from '~/server/auth/session.server';
import { findEvent } from '~/server/db/events.server';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  // hide while this is still in dev
  await requireAdminUser(request);
  const user = await requireUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const raceId = params.raceId as string;
  const race = await findRace(raceId);

  if (!race) {
    return badRequest({ error: t('No Race') });
  }

  const eventId = race.eventId;
  const event = await findEvent(eventId);

  if (!event) {
    return badRequest({ error: t('Event not found') });
  }
  if (event.createdById !== user.id) {
    return badRequest({ error: t('Not authorized') });
  }

  const races: Array<Race> = (await findEventRaces(eventId)) as Race[];

  const position = races.findIndex((r) => r.id === raceId);
  const next = races[position + 1];

  await updateDisplayOrderDown(race, next);

  return json({});
};
