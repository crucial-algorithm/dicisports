import type { ShirtSize } from '@prisma/client';

import { db } from '~/server/db.server';
import type { Difficulty, OrganizerType, Sport } from '~/types';
import {
  dbDifficultyToDifficulty,
  dbOrganizerTypeToOrganizerType,
  dbSportToSport
} from '~/server/db/codecs.server';

async function findSports(): Promise<Array<Sport>> {
  const sport = await db.sport.findMany();

  return sport.map(dbSportToSport);
}

async function findDifficulties(): Promise<Array<Difficulty>> {
  const difficulties = await db.difficulty.findMany({ orderBy: { id: 'asc' } });

  return difficulties.map(dbDifficultyToDifficulty);
}

async function findShirtSizes(): Promise<Array<ShirtSize>> {
  return db.shirtSize.findMany({
    orderBy: {
      id: 'asc'
    }
  });
}

async function findOrganizerTypes(): Promise<Array<OrganizerType>> {
  const organizerTypes = await db.organizerType.findMany({
    orderBy: {
      id: 'asc'
    }
  });

  return organizerTypes.map(dbOrganizerTypeToOrganizerType);
}

export {
  findSports,
  findDifficulties,
  findShirtSizes,
  findOrganizerTypes
};
