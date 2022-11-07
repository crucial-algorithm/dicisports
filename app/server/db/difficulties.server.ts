import { db } from '~/server/db.server';
import type { Difficulty } from '~/types';
import { dbDifficultyToDifficulty } from '~/server/db/codecs.server';

async function findDifficulties(): Promise<Array<Difficulty>> {
  const difficulties = await db.difficulty.findMany();

  return difficulties.map(dbDifficultyToDifficulty);
}

export { findDifficulties };
