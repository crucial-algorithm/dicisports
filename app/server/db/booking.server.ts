import { PrismaClient } from '@prisma/client';
import type { CheckoutStatus, Prisma } from '@prisma/client';

import { db } from '~/server/db.server';

import { dbRawBookingListToBookingList, dbUICartToUICart } from '~/server/db/codecs.server';
import Id from '~/server/utils/Id.server';
import type { Booking, DBRawUICartRow, UICartRow, BookingList, DBRawBookingList } from '~/types';

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
  bookingId: string,
  pin: number,
  eventId: string,
  userSessionId: string
): Promise<Booking> {
  return await db.booking.create({
    data: {
      id: bookingId,
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

async function changeRegistrationToAuthUser(
  authUser: string,
  oldUser: string
): Promise<void> {
  const prisma = new PrismaClient();

  return prisma.$transaction(async (prisma) => {
    await prisma.booking.updateMany({
      where: {
        userId: oldUser
      },
      data: {
        userId: authUser
      }
    });

    await prisma.participant.updateMany({
      where: {
        userId: oldUser
      },
      data: {
        userId: authUser
      }
    });

  });
}

async function findUserBookingsList(
  userId: string,
  page: number,
  searchedName: string | null,
  pageSize = 10
): Promise<{ results: BookingList[]; total: number }> {
  const name = `%${searchedName?.length ? searchedName : ''}%`;

  const results: Array<DBRawBookingList> = await db.$queryRaw`
    SELECT *, count(1) over () as records
    FROM (SELECT b.id, e.name as event_name, b.created_at as booking_date, b.status, COUNT(rp.id) as total_participants
          FROM bookings b
            INNER JOIN events e on e.id = b.event_id
            INNER JOIN race_participants rp on b.id = rp.booking_id
          WHERE user_id = ${userId}
          AND e.name ILIKE ${name}
          GROUP BY b.id, e.name, b.created_at, b.status) as P LIMIT ${pageSize}
    OFFSET ${page * pageSize};
  `;
  const mapped = results.map(dbRawBookingListToBookingList);
  const total = results.length === 0 ? 0 : Number(results[0].records);

  return { results: mapped, total };
}

async function findBookingById(id: string): Promise<Booking | null> {
  return await db.booking.findUnique({
    where: { id }
  });
} 

export {
  updateBookingStatus,
  findBooking,
  createBooking,
  removeBooking,
  findBookingCart,
  changeRegistrationToAuthUser,
  findUserBookingsList,
  findBookingById
};
