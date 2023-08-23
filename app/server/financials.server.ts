import type { RaceRevenueRegistrations } from '~/types';

import { db } from './db.server';

// booking_amount                 -> Total booking price including discounts

// Revenue                        -> Dicisports total take
// Organizer Event Revenue        -> Organizer total take for event
// Gross Merchandise Value(GMV)   -> Organizer/platform total sales not including our commission and discounts

function handleCommission(value: number) {
  // Commission is multiplied by 1000, so that's why we are doing / (100 * 1000)
  return value / (100 * 1000);
}

async function getOrganizerEventRevenue(
  eventId: string,
  commission: number
): Promise<number> {
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

  return results[0].revenue
    ? Number(results[0].revenue)
    : 0;
}

async function findRevenueAndRegistrationsPerRace(
  eventId: string,
  commission: number
): Promise<RaceRevenueRegistrations[]> {
  const results: Array<RaceRevenueRegistrations> = await db.$queryRaw`
        SELECT r.id, r.name, count(rp) as registrations, SUM(rp.price) * (1 - ${handleCommission(commission)}) as revenue
        FROM races r
                 LEFT JOIN (SELECT race_id, price
                            FROM race_participants rp
                                     INNER JOIN public.bookings b ON rp.booking_id = b.id
                            WHERE b.status = 'confirmed') as rp ON rp.race_id = r.id
        WHERE event_id = ${eventId}
          AND status = 'auto'
        GROUP BY r.id;
    `;

  return results.map(({ id, name, registrations, revenue }) => {
    return {
      id,
      name,
      registrations: Number(registrations),
      revenue: Number(revenue)
    };
  });
}

export { getOrganizerEventRevenue, findRevenueAndRegistrationsPerRace };
