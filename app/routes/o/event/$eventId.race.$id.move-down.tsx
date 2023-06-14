import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

import {
  findEventRaces,
  findRace,
  updateDisplayOrderDown
} from '~/server/db/races.server';
import type { Race } from '~/types';
import i18n from '~/server/i18n.server';
import { requireUser } from '~/server/auth/session.server';
import { findEvent } from '~/server/db/events.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const eventId = params.eventId as string;
  const raceId = params.id as string;
  const race = await findRace(raceId);
  const event = await findEvent(eventId);

  if (!race) {
    throw NotFound(t('Race not found'));
  }

  if (!event) {
    throw NotFound(t('Event not found'));
  }

  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  if (race.eventId !== eventId) {
    // weird - just in case, verify consistency in route
    throw NotFound(t('Race not found'));
  }

  const races: Array<Race> = (await findEventRaces(eventId)) as Race[];

  const position = races.findIndex((r) => r.id === raceId);
  const next = races[position + 1];

  await updateDisplayOrderDown(race, next);

  return json({});
};
