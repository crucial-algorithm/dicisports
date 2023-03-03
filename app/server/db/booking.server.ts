import type { CheckoutStatus, Prisma } from '@prisma/client';

import { dbUICartToUICart } from '~/server/db/codecs.server';
import type { DBRawUICartRow, UICartRow } from '~/types';

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

async function findBookingCart(
  userId: string,
  eventId: string
): Promise<UICartRow[]> {
  const query = `
        SELECT b.id,
               r.id              AS race_id,
               r.name,
               r.price,
               r.distance,
               r.start_time,
               r.display_order, 
               count(1)          AS qtd
        FROM bookings b
                 INNER JOIN race_participants rp ON (b.id = rp.booking_id)
                 INNER JOIN races r ON rp.race_id = r.id
        WHERE b.user_id = '${userId}'
          AND b.event_id = '${eventId}'
        GROUP BY b.id, r.id, r.name, r.price, r.distance, r.start_time, r.display_order;
    `;

  const results: Array<DBRawUICartRow> = await db.$queryRawUnsafe(query);

  return results.map(dbUICartToUICart);
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

export { updateBookingStatus, findBooking, createBooking, removeBooking, findBookingCart };
