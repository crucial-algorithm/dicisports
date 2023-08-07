import type { Prisma, LatestBibNumber } from '@prisma/client';

import { db } from '~/server/db.server';

async function createEventLatestBibNumber(
  eventId: string,
  tx?: Prisma.TransactionClient
): Promise<LatestBibNumber> {
  const now = new Date();

  return await (tx || db).latestBibNumber.create({
    data: {
      eventId,
      createdAt: now,
      updatedAt: now
    }
  });
}

async function updateEventLatestBibNumber(
  eventId: string,
  bibNumber: number,
  tx?: Prisma.TransactionClient
): Promise<LatestBibNumber> {
  return await (tx || db).latestBibNumber.update({
    where: {
      eventId
    },
    data: {
      bibNumber
    }
  });
}

export { createEventLatestBibNumber, updateEventLatestBibNumber };