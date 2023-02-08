import { db } from '~/server/db.server';
import type { Race, RaceParticipant } from '~/types';

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

export { findRaceParticipants };
