import type { Booking, Prisma } from '@prisma/client';
import {
  CheckoutStatus,
  PaymentStatus,
  PrismaClient,
  RaceParticipantStatus
} from '@prisma/client';

import { db } from '~/server/db.server';
import type { UICartRow } from '~/types';
import { bookingAmount } from '~/utils/misc';

async function findBooking(id: string): Promise<Booking | null> {
  return db.booking.findUnique({
    where: { id }
  });
}

async function findBookingCart(bookingId: string) {
  const bookingCart = await db.raceParticipant.groupBy({
    by: ['raceId'],
    where: {
      bookingId,
      status: { not: RaceParticipantStatus.deleted }
    },
    _count: {
      id: true
    }
  });

  const bookingRaces = await db.race.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      priceEarlyBird: true,
      validUntil: true,
      priceLateBird: true,
      applyAfter: true,
      distance: true,
      startTime: true,
      displayOrder: true
    },
    where: { id: { in: bookingCart.map((r) => r.raceId) } }
  });

  return bookingRaces.map((t) => {
    const raceCount = bookingCart.find((c) => c.raceId === t.id);
    const totalParticipants = raceCount ? raceCount._count.id : 0;

    let price = t.price;

    if (t.priceEarlyBird && t.validUntil && t.validUntil > new Date()) {
      price = t.priceEarlyBird;
    } else if (t.priceLateBird && t.applyAfter && t.applyAfter <= new Date()) {
      price = t.priceLateBird;
    }

    return {
      id: bookingId,
      raceId: t.id,
      name: t.name,
      price,
      distance: t.distance,
      startTime: t.startTime,
      order: t.displayOrder,
      qty: totalParticipants
    };
  });
}

async function createBooking(
  bookingId: string,
  pin: number,
  eventId: string,
  userSessionId: string
): Promise<Booking> {
  return db.booking.create({
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
  await (tx || db).booking.update({
    where: { id: bookingId },
    data: {
      status: CheckoutStatus.deleted
    }
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
) {
  const where: Prisma.BookingWhereInput = {
    userId,
    event: {
      name: {
        contains: searchedName && searchedName.length ? searchedName : '',
        // Same as ILIKE in postgres
        mode: 'insensitive'
      }
    }
  };

  const results = await db.booking.findMany({
    select: {
      id: true,
      event: {
        select: {
          name: true
        }
      },
      createdAt: true,
      status: true,
      pin: true,
      raceParticipant: {
        where: {
          status: { not: RaceParticipantStatus.deleted }
        }
      }
    },
    where,
    take: pageSize,
    skip: page * pageSize
  });

  // Total bookings ignoring skip and limit/take
  const total = await db.booking.aggregate({
    _count: {
      _all: true
    },
    where
  });

  return {
    results: results.map((r) => {
      return {
        id: r.id,
        event: { name: r.event.name as string },
        createdAt: r.createdAt,
        status: r.status,
        pin: r.pin,
        totalParticipants: r.raceParticipant.length
      };
    }),
    total: total._count._all
  };
}
/**
 * Update booking status follows the following flow:
 * 1. When a booking is created, it is in the 'checkout' status
 * 2. When a booking payment was submitted but is waiting payment from user, it is in the 'pending' status
 * 3. When a booking is paid, it is in the 'confirmed' status
 * 4. When a booking is deleted, it is in the 'deleted' status
 *
 * When a payment fails or experies, booking status is updated to 'checkout' 
 * 
 * @param id 
 * @param status 
 * @returns 
 */
async function updateBookingStatus(
  id: string,
  status: CheckoutStatus
): Promise<Booking> {
  return db.booking.update({
    where: { id },
    data: {
      status
    }
  });
}

async function findConfirmedBookings(
  eventId: string
): Promise<Booking[] | null> {
  return db.booking.findMany({
    where: { eventId, status: 'confirmed' }
  });
}

// discountInfo contains applied discount information - discount code|value|fixed
async function applyDiscountCode(
  id: string,
  code: string,
  value: number,
  fixed: boolean,
  cart: UICartRow[]
) {
  return await db.$transaction(async (tx) => {
    const amount = bookingAmount(cart, Number(value), fixed);

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
        discountCode: code,
        discountValue: value,
        discountFixed: fixed
      }
    });
  });
}

async function removeBookingDiscount(id: string) {
  return db.booking.update({
    where: { id },
    data: {
      discountCode: null,
      discountValue: null,
      discountFixed: null
    }
  });
}

async function findUserOngoingBookingsByEvent(
  userId: string,
  eventId: string
): Promise<Booking[]> {
  return db.booking.findMany({
    where: {
      userId,
      eventId,
      status: { notIn: [CheckoutStatus.confirmed, CheckoutStatus.deleted] }
    }
  });
}

function checkIfBookingEditionIsLocked(booking: Booking) {
  return (
    booking.status === CheckoutStatus.confirmed ||
    booking.status === CheckoutStatus.deleted ||
    booking.status === CheckoutStatus.pending
  );
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
  findUserOngoingBookingsByEvent,
  checkIfBookingEditionIsLocked
};
