import { CheckoutStatus, PaymentStatus } from '@prisma/client';

import type { RaceRevenueRegistrations } from '~/types';
import { findEvent } from '~/server/db/events.server';
import { findOrganizer } from '~/server/db/organizer.server';

import { db } from './db.server';

// Definitions:
// ============
//
// Gross Merchandise Volume(GMV)  -> Organizer/platform total sales not including our commission and discounts:
//                                   participants * race price
//
// Booking amount                 -> Total booking price after discounts (taken from payments table)
//                                   GMV - discount
//
// Commission                     -> % Dicisports takes from booking amount (defined at organizers level)
//
// Net Merchandise Value(NMV)     -> Amount organizers will make from GMV:
//                                   GMV - discounts - commission
//
// Revenue                        -> Amount Dicisports will make from GMV:
//                                   (GMV - discount) * commission
//
// Cost                           -> Amount paid to SIBS:
//                                   (GMV - discount) * sibs fare

function handleCommission(value: number) {
  // Commission is multiplied by 1000 on save, so that's why we are doing / (100 * 1000)
  return value / (100 * 1000);
}

async function calculateEventNMV(eventId: string): Promise<number> {
  const commission = await findOrganizerCommission(eventId);
  const formattedCommission = 1 - handleCommission(commission);

  const payments = await db.payment.findMany({
    select: {
      amount: true
    },
    where: {
      booking: {
        status: CheckoutStatus.confirmed,
        eventId
      },
      status: PaymentStatus.paid
    }
  });

  if (!payments || payments.length === 0) {
    return 0;
  }

  return payments.reduce(
    (total, { amount }) => total + amount * formattedCommission,
    0
  );
}

async function calculateEventBookingsAmount(eventId: string) {
  const payments = await db.payment.aggregate({
    where: { booking: { status: CheckoutStatus.confirmed, eventId } },
    _sum: {
      amount: true
    }
  });

  return !payments._sum.amount ? 0 : Number(payments._sum.amount);
}

async function calculateEventGMV(eventId: string) {
  const raceParticipants = await db.raceParticipant.aggregate({
    where: { eventId, booking: { status: CheckoutStatus.confirmed } },
    _sum: {
      price: true
    }
  });

  return !raceParticipants._sum.price ? 0 : Number(raceParticipants._sum.price);
}

async function calculateApproximateRaceDiscount(
  eventId: string,
  nbrOfRaces: number
) {
  const eventGMV = await calculateEventGMV(eventId);
  const eventBookingsAmount = await calculateEventBookingsAmount(eventId);

  const discount = (eventGMV - eventBookingsAmount) / nbrOfRaces;

  return Math.round(discount * 100) / 100;
}

async function calculateRaceNMV(
  eventId: string
): Promise<RaceRevenueRegistrations[]> {
  const commission = await findOrganizerCommission(eventId);
  const formattedCommission = 1 - handleCommission(commission);

  const results = await db.race.findMany({
    where: {
      eventId: eventId,
      status: 'auto'
    },
    include: {
      raceParticipant: {
        select: {
          price: true
        },
        where: {
          booking: {
            status: CheckoutStatus.confirmed
          }
        }
      }
    }
  });

  const raceDiscount = await calculateApproximateRaceDiscount(
    eventId,
    results.length
  );

  return results.map(({ id, name, raceParticipant }) => {
    const registrations = raceParticipant.length;
    const raceGMV = registrations
      ? raceParticipant.reduce(
          (total, { price }) => total + Number(price) * formattedCommission,
          0
        )
      : 0;

    return {
      id,
      name,
      registrations,
      revenue: raceGMV !== 0 ? raceGMV - raceDiscount : raceGMV
    };
  });
}

async function findOrganizerCommission(eventId: string): Promise<number> {
  const event = await findEvent(eventId);
  const organizer = await findOrganizer(event?.createdById as string);

  const commission = organizer?.commission;

  if (commission === null || commission === undefined) {
    throw new Error(`organizer ${event?.createdById} has no commission...`);
  }

  return commission;
}

export { calculateEventNMV, calculateRaceNMV };
