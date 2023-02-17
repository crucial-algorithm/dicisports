import type { CheckoutStatus, Prisma } from '@prisma/client';

import type { Booking } from '~/types';
import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';

async function updateBookingStatus(
  status: CheckoutStatus,
  userSessionId: string,
  eventId: string
): Promise<Booking> {
  return await db.booking.update({
    where: { eventId_userId: { eventId, userId: userSessionId } },
    data: {
      status
    }
  });
}

async function findBooking(
  userSessionId: string,
  eventId: string
): Promise<Booking | null> {
  return db.booking.findUnique({
    where: { eventId_userId: { eventId, userId: userSessionId } }
  });
}

async function createBooking(
  pin: number,
  eventId: string,
  userSessionId: string
): Promise<Booking> {
  return await db.booking.create({
    data: {
      id: Id(),
      pin,
      eventId,
      userId: userSessionId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}

async function removeBooking(
  userSessionId: string,
  eventId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  await (tx || db).booking.delete({
    where: { eventId_userId: { eventId, userId: userSessionId } }
  });
}

export { updateBookingStatus, findBooking, createBooking, removeBooking };
