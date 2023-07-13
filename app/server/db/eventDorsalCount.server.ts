import type { Prisma } from '@prisma/client';

import { db } from '~/server/db.server';

import Id from '../utils/Id.server';

async function upsertEventCount(
  eventId: string,
  dorsal: number = 0,
  tx?: Prisma.TransactionClient
) {
  const now = new Date();

  return await (tx || db).eventDorsalCount.upsert({
    where: {
      eventId
    },
    update: {
      dorsal
    },
    create: {
      id: Id(),
      dorsal,
      eventId,
      createdAt: now,
      updatedAt: now
    }
  });
}

export { upsertEventCount };