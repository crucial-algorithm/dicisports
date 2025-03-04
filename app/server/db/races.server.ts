import { PrismaClient, RaceParticipantStatus } from '@prisma/client';
import type { Race } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type { CreateRaceInput } from '~/types';

const prisma = new PrismaClient();

async function createRace(race: CreateRaceInput, tx: PrismaClient = null): Promise<Race> {
  const raceId = race.id || Id();
  const raceAt = new Date();

  return (tx || db).race.create({
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
      priceLateBird: race.priceLateBird,
      applyAfter: race.applyAfter,
      raceDescription: race.raceDescription,
      track: race.track,
      eventId: race.eventId
    }
  });
}

async function createRaces(races: CreateRaceInput[]) {
  return await prisma.$transaction(async (tx) => {
    for (const race of races) {
      await createRace(race, tx);
    }
  });
}



async function findEventRaces(eventId: string): Promise<Race[] | null> {
  return db.race.findMany({
    where: { eventId: eventId, status: { not: 'deleted' } },
    orderBy: { displayOrder: 'asc' }
  });
}

async function findRace(raceId: string): Promise<Race | null> {
  return db.race.findUnique({
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
    priceLateBird: race.priceLateBird,
    applyAfter: race.applyAfter,
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

async function findRegistrationsAddedToCart(
  eventId: string
): Promise<Array<{ id: string; total: number }>> {
  const results = await db.raceParticipant.groupBy({
    by: ['raceId'],
    _count: { raceId: true },
    where: { race: { eventId }, status: { not: RaceParticipantStatus.deleted } }
  });

  return results.map(({ raceId, _count }) => ({
    id: raceId,
    total: _count.raceId
  }));
}

export {
  createRace,
  createRaces,
  findEventRaces,
  findRace,
  updateRace,
  updateDisplayOrderUp,
  updateDisplayOrderDown,
  deleteRace,
  findRegistrationsAddedToCart
};
