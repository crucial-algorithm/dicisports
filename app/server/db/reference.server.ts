import type { ShirtSize } from '@prisma/client';

import { db } from '~/server/db.server';
import type {
  Difficulty,
  GroupSpirit,
  GroupType,
  OrganizerType,
  Sport
} from '~/types';
import {
  dbDifficultyToDifficulty,
  dbGroupSpiritToGroupSpirit,
  dbGroupTypeToGroupType,
  dbOrganizerTypeToOrganizerType,
  dbSportToSport
} from '~/server/db/codecs.server';

async function findSports(): Promise<Array<Sport>> {
  const sport = await db.sport.findMany();

  return sport.map(dbSportToSport);
}

async function findGroupsSpirit(): Promise<Array<GroupSpirit>> {
  const groupTypes = await db.groupSpirit.findMany({
    orderBy: {
      id: 'asc'
    }
  });

  return groupTypes.map(dbGroupSpiritToGroupSpirit);
}

async function findGroupTypes(): Promise<Array<GroupType>> {
  const groupTypes = await db.groupType.findMany({
    orderBy: {
      id: 'asc'
    }
  });

  return groupTypes.map((gt) => dbGroupTypeToGroupType(gt));
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
  findGroupsSpirit,
  findGroupTypes,
  findDifficulties,
  findShirtSizes,
  findOrganizerTypes
};
