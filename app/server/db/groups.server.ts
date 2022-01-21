import { Group, DaysOfWeek, GroupSpirit } from '~/types'
import { db } from '~/server/db.server'

async function findGroups(): Promise<Array<Group>> {
  const groups = await db.group.findMany()
  return groups.map((g) => {
    return { ...g, dayOfWeek: g.dayOfWeek as DaysOfWeek }
  })
}

async function findUserGroups(userId: string): Promise<Array<Group>> {
  const groups = await db.group.findMany({
    where: { createdById: userId },
    include: {
      groupSpirit: true,
      createdBy: true
    }
  })
  return groups.map((g) => {
    return {
      ...g,
      dayOfWeek: g.dayOfWeek as DaysOfWeek,
      groupSpirit: g.groupSpirit as GroupSpirit
    }
  })
}

export { findGroups, findUserGroups }
