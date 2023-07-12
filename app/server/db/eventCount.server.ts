import type { EventCount, Prisma } from '@prisma/client';

import { db } from '~/server/db.server';

import Id from '../utils/Id.server';

async function createEventCount(
  dorsalNumber: number,
  eventId: string,
  tx?: Prisma.TransactionClient
): Promise<EventCount> {
  return await (tx || db).eventCount.create({
    data: {
      id: Id(),
      eventId,
      count: dorsalNumber
    }
  });
}

async function updateEventCount(
  newDorsalNumber: number,
  eventId: string,
  tx?: Prisma.TransactionClient
): Promise<EventCount> {
  return await (tx || db).eventCount.update({
    where: { eventId },
    data: {
      count: newDorsalNumber
    }
  });
}

export { createEventCount, updateEventCount };