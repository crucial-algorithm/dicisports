import { db } from '~/server/db.server';
import type { Difficulty } from '~/types';
import { dbDifficultyToDifficulty } from '~/server/db/codecs.server';

async function findDifficulties(): Promise<Array<Difficulty>> {
  const difficulties = await db.difficulty.findMany();

  return difficulties.map(dbDifficultyToDifficulty);
}

async function findDifficulty(id: number): Promise<Difficulty | null> {
  return await db.difficulty.findUnique({
    where: { id }
  });
}

export { findDifficulties, findDifficulty };
