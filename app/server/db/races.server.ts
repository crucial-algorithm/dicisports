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

  const results: Array<RaceRevenueRegistrations> = await db.$queryRawUnsafe(
    query
  );

  return results.map(({ id, name, registrations, revenue }) => {
    return {
      id,
      name,
      registrations: Number(registrations),
      revenue: Number(revenue)
    };
  });
}

async function findRegistrationsAddedToCart(
  eventId: string
): Promise<Array<{ id: string; total: number }>> {
  const results: Array<{ id: string; total: number }> = await db.$queryRaw`
        SELECT r.id, sum(c.qtd) as total
        FROM carts c
                 INNER JOIN races r on c.race_id = r.id
            and r.event_id = ${eventId}
        GROUP BY r.id;
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
  findRegistrationsAddedToCart
};
