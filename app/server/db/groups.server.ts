import { PrismaClient, Status } from '@prisma/client';

import type {
  CreateGroupInput,
  CreateScheduleInput,
  Group
} from '~/types';
import { db } from '~/server/db.server';
import { dbGroupToGroup } from '~/server/db/codecs.server';
import Id from '~/server/utils/Id.server';
import { generateSlug, hoursMinutesToTimeOfDay } from '~/utils/misc';

const prisma = new PrismaClient();

async function findGroups(): Promise<Array<Group>> {
  const groups = await db.group.findMany();

  return groups.map(dbGroupToGroup);
}

async function findUserGroups(userId: string): Promise<Array<Group>> {
  const groups = await db.group.findMany({
    where: { createdById: userId, status: Status.published },
    include: {
      groupSpirit: true,
      createdBy: true,
      schedules: true
    },
    orderBy: { name: 'asc' }
  });

  return groups.map(dbGroupToGroup);
}

async function findUserFavoriteGroups(id: string): Promise<Array<Group>> {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      favGroups: true
    }
  });

  if (!user) {
    return [];
  }
  const groups = await db.group.findMany({
    where: { id: { in: user?.favGroups.map((fg) => fg.groupId) } },
    include: { createdBy: true, groupSpirit: true }
  });

  return groups.map(dbGroupToGroup);
}

async function findGroup(id: string): Promise<Group | null> {
  const group = await db.group.findUnique({
    where: { id },
    include: {
      groupType: true,
      groupSpirit: true,
      sport: true,
      schedules: true
    }
  });

  if (!group) {
    return null;
  }
  return dbGroupToGroup(group);
}

async function findGroupBySlug(slug: string): Promise<Group | null> {
  const group = await db.group.findUnique({
    where: { slug },
    include: {
      groupType: true,
      groupSpirit: true,
      sport: true,
      createdBy: true
    }
  });

  if (!group) {
    return null;
  }
  return dbGroupToGroup(group);
}

async function assignUniqueSlug(name: string, attempt = 0): Promise<string> {
  const prefix = `${Math.floor(Math.random() * 1000)}-`;
  const slug = `${attempt ? prefix : ''}${generateSlug(name)}`;

  console.log(`attempt nbr ${attempt}, slug = ${slug}`);
  const group = await db.group.findUnique({
    where: { slug }
  });

  if (!group) {
    return slug;
  }
  return await assignUniqueSlug(name, ++attempt);
}

async function updateGroup(
  group: CreateGroupInput,
  schedules: { day: number; hour: number; minute: number }[]
): Promise<void> {
  const groupInDb = await findGroup(group.id as string);

  if (!groupInDb || groupInDb.slug === null) {
    group.slug = await assignUniqueSlug(group.name);
  }
  return await prisma.$transaction(async (prisma) => {
    await prisma.group.update({
      where: { id: group.id },
      data: { ...group, status: Status.published }
    });

    await removeSchedules(group.id as string);
    await createSchedules(
      schedules.map((s) => {
        return {
          id: Id(),
          dayOfWeek: s.day,
          timeOfDay: hoursMinutesToTimeOfDay(s.hour, s.minute),
          groupId: group.id as string
        };
      })
    );
  });
}

async function createDraftGroup(
  createdById: string,
  id?: string
): Promise<Group> {
  const groupId = id ? id : Id();
  const createdAt = new Date();
  const updatedAt = createdAt;

  return dbGroupToGroup(
    await db.group.create({
      data: {
        id: groupId,
        slug: null,
        sportId: 1,
        groupTypeId: 1,
        groupSpiritId: 1,
        dayOfWeek: 6,
        timeOfDay: 900,
        createdById,
        createdAt,
        updatedAt,
        lat: 0,
        lng: 0
      }
    })
  );
}

async function deleteGroup(id: string): Promise<void> {
  await db.group.update({
    where: { id },
    data: { status: 'deleted' }
  });
}

async function addGroupToFavorites(
  userId: string,
  groupId: string
): Promise<void> {
  await db.favoriteGroup.create({
    data: { userId, groupId }
  });
}

async function removeGroupFromFavorites(
  userId: string,
  groupId: string
): Promise<void> {
  await db.favoriteGroup.delete({
    where: { userId_groupId: { userId, groupId } }
  });
}

async function findSchedules(groupId: string) {
  return await db.groupSchedule.findMany({
    where: { groupId }
  });
}

async function createSchedules(schedules: CreateScheduleInput[]) {
  await db.groupSchedule.createMany({
    data: schedules
  });
}

async function removeSchedules(groupId: string) {
  await db.groupSchedule.deleteMany({
    where: { groupId }
  });
}

export {
  findGroup,
  findGroups,
  findUserGroups,
  findGroupBySlug,
  findSchedules,
  updateGroup,
  createDraftGroup,
  deleteGroup,
  addGroupToFavorites,
  removeGroupFromFavorites,
  removeSchedules,
  findUserFavoriteGroups
};
