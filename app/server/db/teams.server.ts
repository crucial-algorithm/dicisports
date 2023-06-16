import type { Prisma } from '@prisma/client';

import { db } from '~/server/db.server';
import type { EventTeam } from '~/types';
import Id from '~/server/utils/Id.server';

async function findEventTeams(eventId: string): Promise<EventTeam[] | null> {
  return await db.eventTeam.findMany({
    where: {
      eventId
    }
  });
}

async function createTeam(
  name: string,
  eventId: string,
  tx?: Prisma.TransactionClient
): Promise<EventTeam> {
  const currentDate = new Date();

  return await (tx || db).eventTeam.create({
    data: {
      id: Id(),
      name,
      eventId,
      createdAt: currentDate,
      updatedAt: currentDate
    }
  });
}

async function findEventTeamByName(
  name: string,
  eventId: string,
  tx?: Prisma.TransactionClient
): Promise<EventTeam | null> {
  return await (tx || db).eventTeam.findUnique({
    where: {
      name_eventId: { name, eventId }
    }
  });
}

export { findEventTeams, createTeam, findEventTeamByName };