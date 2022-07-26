import { db } from '~/server/db.server';
import type { Sport } from '~/types';
import { dbSportToSport } from '~/server/db/codecs.server';

async function findSports(): Promise<Array<Sport>> {
  const sport = await db.sport.findMany();

  return sport.map(dbSportToSport);
}

export { findSports };
