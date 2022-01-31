import { CreateGroupInput, Group } from '~/types'
import { db } from '~/server/db.server'
import { dbGroupToGroup } from '~/server/db/codecs.server'
import Id from '~/server/utils/Id.server'

async function findGroups(): Promise<Array<Group>> {
  const groups = await db.group.findMany()
  return groups.map(dbGroupToGroup)
}

async function findUserGroups(userId: string): Promise<Array<Group>> {
  const groups = await db.group.findMany({
    where: { createdById: userId },
    include: {
      groupSpirit: true,
      createdBy: true
    }
  })
  return groups.map(dbGroupToGroup)
}

async function findGroup(id: string): Promise<Group | null> {
  const group = await db.group.findUnique({
    where: { id },
    include: { groupType: true, groupSpirit: true, sport: true }
  })
  if (!group) return null
  return dbGroupToGroup(group)
}

async function createGroup(
  group: CreateGroupInput,
  userId: string
): Promise<string> {
  const id = Id()

  await db.group.create({
    data: {
      ...group,
      id,
      createdById: userId
    }
  })
  return id
}

async function updateGroup(group: CreateGroupInput): Promise<void> {
  await db.group.update({ where: { id: group.id }, data: group })
}

export { findGroup, findGroups, findUserGroups, createGroup, updateGroup }
