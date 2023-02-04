import { CheckoutStatus } from '@prisma/client';

import { db } from '~/server/db.server';
import type { Race, RaceParticipant, RaceRevenueRegistrations } from '~/types';

async function findRevenueAndRegistrationsPerRace(
  eventId: string
): Promise<RaceRevenueRegistrations[]> {
  const query = `
        SELECT r.id,
               r.name                 as name,
               count(rp.id)           as registrations,
               r.price * count(rp.id) as revenue
        FROM races r
                 LEFT JOIN (SELECT rp.id, event_id, race_id
                            FROM race_participants rp
                                     INNER JOIN bookings b on rp.booking_id = b.id
                            WHERE b.status = '${CheckoutStatus.confirmed}'
                              AND b.event_id = '${eventId}') as rp on r.id = rp.race_id
        GROUP BY r.id;
    `;

  return await db.$queryRawUnsafe(query);
}

async function findRaceParticipants(
  eventRaces: Race[]
): Promise<RaceParticipant[]> {
  return await db.raceParticipant.findMany({
    where: {
      raceId: { in: eventRaces.map((r) => r.id) }
    },
    include: {
      participant: true,
      race: true,
      booking: true
    }
  });
}

export { findRevenueAndRegistrationsPerRace, findRaceParticipants };
