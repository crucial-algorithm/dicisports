import type { CheckoutStatus, Prisma } from '@prisma/client';
import { PaymentStatus, PrismaClient } from '@prisma/client';

import { db } from '~/server/db.server';
import type { Booking, BookingList, UICartRow } from '~/types';
import { bookingAmount } from '~/utils/misc';

async function findBooking(id: string): Promise<Booking | null> {
  return await db.booking.findUnique({
    where: { id }
  });
}

async function findBookingCart(bookingId: string): Promise<UICartRow[]> {
  const bookingCart = await db.raceParticipant.groupBy({
    by: ['raceId'],
    where: { bookingId },
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
      distance: true,
      startTime: true,
      displayOrder: true
    },
    where: { id: { in: bookingCart.map((r) => r.raceId) } }
  });

  return bookingRaces.map((t) => {
    const raceCount = bookingCart.find((c) => c.raceId === t.id);
    const totalParticipants = raceCount ? raceCount._count.id : 0;

    // This is the value displayed in cart for total price per race
    const price =
      t.priceEarlyBird && t.validUntil && new Date(t.validUntil) > new Date()
        ? t.priceEarlyBird
        : t.price;

    return {
      id: bookingId,
      raceId: t.id,
      name: t.name,
      price: price,
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
      _count: {
        select: {
          raceParticipant: true
        }
      }
    },
    where: {
      userId,
      event: {
        name: {
          contains: name,
          // Same as ILIKE in postgres
          mode: 'insensitive'
        }
      }
    },
    take: pageSize,
    skip: page * pageSize
  });

  // Total bookings ignoring skip and limit/take
  const total = await db.booking.aggregate({
    _count: {
      _all: true
    },
    where: {
      userId,
      event: {
        name: {
          contains: name,
          mode: 'insensitive'
        }
      }
    }
  });

  return {
    results: results.map((r) => {
      return {
        id: r.id,
        eventName: r.event.name as string,
        bookingDate: r.createdAt,
        status: r.status,
        pin: r.pin,
        totalParticipants: r._count.raceParticipant
      };
    }),
    total: total._count._all
  };
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
  removeBookingDiscount
};
