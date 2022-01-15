import { db } from '~/server/db.server'
import { Sport } from '@prisma/client'

async function findSports(): Promise<Array<Sport>> {
  return db.sport.findMany()
}

export { findSports }
