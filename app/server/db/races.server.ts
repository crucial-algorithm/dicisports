import { CheckoutStatus, PrismaClient } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type { CreateRaceInput, Race } from '~/types';
import type { RaceRevenueRegistrations } from '~/types';

const prisma = new PrismaClient();

async function createRace(race: CreateRaceInput): Promise<Race> {
  const raceId = race.id || Id();
  const raceAt = new Date();

  return await db.race.create({
    data: {
      id: raceId,
      name: race.name,
      distance: race.distance,
      createdAt: raceAt,
      updatedAt: raceAt,
      startTime: race.startTime,
      elevationGain: race.elevationGain,
      elevationLoss: race.elevationLoss,
      price: race.price,
      priceEarlyBird: race.priceEarlyBird,
      validUntil: race.validUntil,
      raceDescription: race.raceDescription,
      track: race.track,
      eventId: race.eventId
    }
  });
}

async function findEventRaces(eventId: string): Promise<Race[] | null> {
  return await db.race.findMany({
    where: { eventId: eventId, status: { not: 'deleted' } },
    orderBy: { displayOrder: 'asc' }
  });
}

async function findRace(raceId: string): Promise<Race | null> {
  return await db.race.findUnique({
    where: { id: raceId }
  });
}

async function updateRace(
  race: CreateRaceInput,
  clearTrack = false
): Promise<void> {
  const raceAt = new Date();

  const update = {
    name: race.name,
    distance: race.distance,
    updatedAt: raceAt,
    startTime: race.startTime,
    elevationGain: race.elevationGain,
    elevationLoss: race.elevationLoss,
    price: race.price,
    priceEarlyBird: race.priceEarlyBird,
    validUntil: race.validUntil,
    raceDescription: race.raceDescription,
    displayOrder: race.displayOrder as number
  };

  if (clearTrack) {
    //@ts-ignore
    update.track = null;
  }

  if (race.track !== null) {
    //@ts-ignore
    update.track = race.track;
  }

  await db.race.update({
    where: { id: race.id as string },
    data: update
  });
}

async function updateDisplayOrderUp(
  current: Race,
  previous: Race
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    await prisma.race.update({
      where: { id: current.id },
      data: {
        displayOrder: previous.displayOrder
      }
    });

    await prisma.race.update({
      where: { id: previous.id },
      data: {
        displayOrder: current.displayOrder
      }
    });
  });
}

async function updateDisplayOrderDown(
  current: Race,
  next: Race
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    await prisma.race.update({
      where: { id: current.id },
      data: {
        displayOrder: next.displayOrder
      }
    });

    await prisma.race.update({
      where: { id: next.id },
      data: {
        displayOrder: current.displayOrder
      }
    });
  });
}

async function deleteRace(id: string) {
  await db.race.update({
    where: { id },
    data: {
      status: 'deleted'
    }
  });
}

async function findEventRevenue(eventId: string): Promise<number> {
  const results: { revenue: number }[] = await db.$queryRaw`
    SELECT SUM(p.amount) as revenue
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

async function findRevenueAndRegistrationsPerRace(
  eventId: string
): Promise<RaceRevenueRegistrations[]> {
  const results: Array<RaceRevenueRegistrations> = await db.$queryRaw`
    SELECT r.id, r.name, count(rp) as registrations, SUM(rp.race_price) as revenue
    FROM races r
           LEFT JOIN (SELECT race_id, race_price
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
      revenue: revenue ? Number(revenue) : 0
    };
  });
}

async function findRegistrationsAddedToCart(
  eventId: string
): Promise<Array<{ id: string; total: number }>> {
  const results: Array<{ id: string; total: number }> = await db.$queryRaw`
        SELECT race_id as id, count(race_id) as total
        FROM race_participants
        WHERE race_id IN (SELECT id FROM races WHERE event_id = ${eventId})
        GROUP BY race_id;
    `;

  return results.map(({ id, total }) => ({
    id,
    total: Number(total)
  }));
}

export {
  createRace,
  findEventRaces,
  findRace,
  updateRace,
  updateDisplayOrderUp,
  updateDisplayOrderDown,
  deleteRace,
  findRevenueAndRegistrationsPerRace,
  findRegistrationsAddedToCart,
  findEventRevenue
};
