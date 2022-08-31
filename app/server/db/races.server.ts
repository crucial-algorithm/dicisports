import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';

import type { CreateRaceInput, Race } from '~/types';

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
    where: { eventId: eventId }
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
      raceDescription: race.raceDescription
    }
  });
}

export { createRace, findEventRaces, updateRace };
