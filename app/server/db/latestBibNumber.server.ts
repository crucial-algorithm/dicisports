import type { Prisma } from '@prisma/client';

import { db } from '~/server/db.server';

import Id from '../utils/Id.server';

async function upsertEventCount(
  eventId: string,
  bibNumber: number = 0,
  tx?: Prisma.TransactionClient
) {
  const now = new Date();

  return await (tx || db).latestBibNumber.upsert({
    where: {
      eventId
    },
    update: {
      bibNumber
    },
    create: {
      eventId,
      bibNumber,
      createdAt: now,
      updatedAt: now
    }
  });
}

export { upsertEventCount };