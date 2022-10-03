import { PrismaClient } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type { CreateRaceInput, Race } from '~/types';

const prisma = new PrismaClient();

async function createRace(race: CreateRaceInput): Promise<Race | void> {
  const raceId = Id();
  const raceAt = new Date();

  await db.race.create({
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
      eventId: race.eventId
    }
  });
}

async function findEventRaces(eventId: string): Promise<Race[] | void> {
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

async function updateRace(race: CreateRaceInput): Promise<void> {
  const raceAt = new Date();

  await db.race.update({
    where: { id: race.id },
    data: {
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
    }
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

export {
  createRace,
  findEventRaces,
  findRace,
  updateRace,
  updateDisplayOrderUp,
  updateDisplayOrderDown,
  deleteRace
};
