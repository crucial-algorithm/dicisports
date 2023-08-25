import { CheckoutStatus } from '@prisma/client';

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

  const results: { revenue: number }[] = await db.$queryRaw`
        SELECT SUM(p.amount) * (1 - ${handleCommission(commission)}) as revenue
        FROM events e
                 LEFT JOIN (SELECT event_id, p.amount
                            FROM bookings b
                                     INNER JOIN public.payments p on b.id = p.booking_id
                            WHERE b.status = 'confirmed'
                              AND p.status = 'paid') as p ON e.id = p.event_id
        WHERE event_id = ${eventId};
    `;

  return results[0].revenue ? Number(results[0].revenue) : 0;
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
  const results: Array<RaceRevenueRegistrations> = await db.$queryRaw`
        SELECT r.id,
               r.name,
               count(rp)                                             as registrations,
               SUM(rp.price) * (1 - ${handleCommission(commission)}) as revenue
        FROM races r
                 LEFT JOIN (SELECT race_id, price
                            FROM race_participants rp
                                     INNER JOIN public.bookings b ON rp.booking_id = b.id
                            WHERE b.status = 'confirmed') as rp ON rp.race_id = r.id
        WHERE event_id = ${eventId}
          AND status = 'auto'
        GROUP BY r.id;
    `;

  const raceDiscount = await calculateApproximateRaceDiscount(eventId, results.length);

  return results.map(({ id, name, registrations, revenue }) => {
    return {
      id,
      name,
      registrations: Number(registrations),
      revenue:
        Number(revenue) !== 0 ? Number(revenue) - raceDiscount : Number(revenue)
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
