import type { Group } from '@prisma/client';
import { Prisma, PrismaClient, Status } from '@prisma/client';

import type { CreateGroupInput, CreateScheduleInput } from '~/types';
import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import { generateSlug, hoursMinutesToTimeOfDay } from '~/utils/misc';

const prisma = new PrismaClient();

const groupWithGroupSpiritOwnerAndSchedules =
  Prisma.validator<Prisma.GroupArgs>()({
    include: {
      groupSpirit: true,
      createdBy: true,
      schedules: true
    }
  });

const groupWithGroupSpiritAndOwner = Prisma.validator<Prisma.GroupArgs>()({
  include: {
    groupSpirit: true,
    createdBy: true
  }
});

const groupWithGroupSpiritTypeSportOwnerAndSchedules =
  Prisma.validator<Prisma.GroupArgs>()({
    include: {
      groupType: true,
      groupSpirit: true,
      sport: true,
      createdBy: true,
      schedules: true
    }
  });

const groupWithGroupSpiritTypeSportAndSchedules =
  Prisma.validator<Prisma.GroupArgs>()({
    include: {
      groupType: true,
      groupSpirit: true,
      sport: true,
      schedules: true
    }
  });

type GroupWithGroupSpiritOwnerAndSchedules = Prisma.GroupGetPayload<
  typeof groupWithGroupSpiritOwnerAndSchedules
>;
type GroupWithGroupSpiritAndOwner = Prisma.GroupGetPayload<
  typeof groupWithGroupSpiritAndOwner
>;
type GroupWithGroupSpiritTypeSportOwnerAndSchedules =
  Prisma.GroupGetPayload<
    typeof groupWithGroupSpiritTypeSportOwnerAndSchedules
  >;

type GroupWithGroupSpiritTypeSportAndSchedules =
  Prisma.GroupGetPayload<
    typeof groupWithGroupSpiritTypeSportAndSchedules
  >;

async function findGroups(): Promise<Array<Group>> {
  return db.group.findMany({
    where: {
      status: Status.published
    }
  });
}

async function findUserGroups(userId: string): Promise<Array<GroupWithGroupSpiritOwnerAndSchedules>> {
  return await db.group.findMany({
    where: { createdById: userId, status: Status.published },
    include: {
      groupSpirit: true,
      createdBy: true,
      schedules: true
    },
    orderBy: { name: 'asc' }
  });
}

async function findUserFavoriteGroups(id: string): Promise<Array<GroupWithGroupSpiritAndOwner>> {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      favGroups: true
    }
  });

  if (!user) {
    return [];
  }

  return await db.group.findMany({
    where: { id: { in: user?.favGroups.map((fg) => fg.groupId) } },
    include: { createdBy: true, groupSpirit: true }
  });
}

async function findGroup(
  id: string
): Promise<GroupWithGroupSpiritTypeSportAndSchedules | null> {
  return db.group.findUnique({
    where: { id },
    include: {
      groupType: true,
      groupSpirit: true,
      sport: true,
      schedules: true
    }
  });
}

async function findGroupBySlug(
  slug: string
): Promise<GroupWithGroupSpiritTypeSportOwnerAndSchedules | null> {
  const group = await db.group.findUnique({
    where: { slug },
    include: {
      groupType: true,
      groupSpirit: true,
      sport: true,
      createdBy: true,
      schedules: true
    }
  });

  if (!group || group.status === Status.deleted) {
    return null;
  } else {
    return group;
  }
}

async function assignUniqueSlug(name: string, attempt = 0): Promise<string> {
  const prefix = `${Math.floor(Math.random() * 1000)}-`;
  const slug = `${attempt ? prefix : ''}${generateSlug(name)}`;

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
  return await prisma.$transaction(async (tx) => {
    const groupInDb = await findGroup(group.id as string);

    if (!groupInDb || groupInDb.slug === null) {
      group.slug = await assignUniqueSlug(group.name as string);
    }

    await tx.group.update({
      where: { id: group.id },
      data: { ...group, status: Status.published }
    });

    await removeSchedules(group.id as string, tx);
    await createSchedules(
      schedules.map((s) => {
        return {
          id: Id(),
          dayOfWeek: s.day,
          timeOfDay: hoursMinutesToTimeOfDay(s.hour, s.minute),
          groupId: group.id as string
        };
      }), tx
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

  return db.group.create({
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
  });
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

async function createSchedules(schedules: CreateScheduleInput[], tx?:  Prisma.TransactionClient) {
  return (tx || db).groupSchedule.createMany({
    data: schedules
  });
}

async function removeSchedules(groupId: string, tx?: Prisma.TransactionClient) {
  return (tx || db).groupSchedule.deleteMany({
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
