import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

import {
  findEventRaces,
  findRace,
  updateDisplayOrderDown
} from '~/server/db/races.server';
import type { Race } from '~/types';
import i18n from '~/server/i18n.server';
import { requireAdminUser, requireUser } from '~/server/auth/session.server';
import { findEvent } from '~/server/db/events.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  // hide while this is still in dev
  await requireAdminUser(request);
  const user = await requireUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const raceId = params.raceId as string;
  const race = await findRace(raceId);

  if (!race) {
    throw NotFound(t('No Race'));
  }

  const eventId = race.eventId;
  const event = await findEvent(eventId);

  if (!event) {
    throw NotFound(t('Event not found'));
  }
  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  const races: Array<Race> = (await findEventRaces(eventId)) as Race[];

  const position = races.findIndex((r) => r.id === raceId);
  const next = races[position + 1];

  await updateDisplayOrderDown(race, next);

  return json({});
};
