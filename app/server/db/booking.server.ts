import type { Prisma } from '@prisma/client';
import { PaymentStatus, PrismaClient, CheckoutStatus } from '@prisma/client';

import { db } from '~/server/db.server';

import {
  dbRawBookingListToBookingList,
  dbUICartToUICart
} from '~/server/db/codecs.server';
import type {
  Booking,
  BookingList,
  DBRawBookingList,
  DBRawUICartRow,
  UICartRow
} from '~/types';
import { bookingAmount } from '~/utils/misc';

async function findBooking(id: string): Promise<Booking | null> {
  return await db.booking.findUnique({
    where: { id }
  });
}

async function findBookingCart(bookingId: string): Promise<UICartRow[]> {
  const results: Array<DBRawUICartRow> = await db.$queryRaw`
    SELECT b.id,
           r.id               AS race_id,
           r.name,
           CASE
             WHEN r.price_early_bird IS NOT NULL AND r.valid_until > current_date THEN r.price_early_bird
             ELSE r.price END as price,
           r.distance,
           r.start_time,
           r.display_order,
           count(1)           AS qty
    FROM bookings b
           INNER JOIN race_participants rp ON (b.id = rp.booking_id)
           INNER JOIN races r ON rp.race_id = r.id
    WHERE b.id = ${bookingId}
    GROUP BY b.id, r.id, r.name, r.price, r.distance, r.start_time, r.display_order;
  `;

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
  bookingId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  await (tx || db).booking.delete({
    where: { id: bookingId }
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
        FROM (SELECT b.id,
                     e.name       as event_name,
                     b.created_at as booking_date,
                     b.status,
                     b.pin,
                     COUNT(rp.id) as total_participants
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

async function updateBookingStatus(
  id: string,
  status: CheckoutStatus
): Promise<Booking> {
  return await db.booking.update({
    where: { id },
    data: {
      status
    }
  });
}

async function findConfirmedBookings(
  eventId: string
): Promise<Booking[] | null> {
  return await db.booking.findMany({
    where: { eventId, status: 'confirmed' }
  });
}

// discountInfo contains applied discount information - discount code|value|fixed
async function applyDiscountCode(
  id: string,
  discountInfo: string,
  cart: UICartRow[]
) {
  return await db.$transaction(async (tx) => {
    const [, value, fixed] = discountInfo.split('|');
    const amount = bookingAmount(cart, Number(value), JSON.parse(fixed));

    await tx.payment.updateMany({
      where: {
        bookingId: id,
        status: { not: { in: [PaymentStatus.paid, PaymentStatus.failed] } }
      },
      data: {
        amount
      }
    });

    await tx.booking.update({
      where: { id },
      data: {
        appliedDiscount: discountInfo
      }
    });
  });
}

async function removeBookingDiscount(id: string) {
  return await db.booking.update({
    where: { id },
    data: {
      appliedDiscount: null
    }
  });
}

async function findUserOngoingBookingsByEvent(
  userId: string,
  eventId: string
): Promise<Booking[]> {
  return await db.booking.findMany({
    where: { userId, eventId, status: { not: CheckoutStatus.confirmed } }
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
  findConfirmedBookings,
  applyDiscountCode,
  removeBookingDiscount,
  findUserOngoingBookingsByEvent
};
