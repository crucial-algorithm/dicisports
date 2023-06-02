import type { Prisma } from '@prisma/client';

import { db } from '~/server/db.server';

import Id from '~/server/utils/Id.server';
import { dbPerkToPerk } from '~/server/db/codecs.server';

import type { CreatePerksInput, Language, Perk } from '~/types';

import json from './perks.json';


async function findEventPerks(eventId: string): Promise<Array<Perk>> {
  const perks = await db.perk.findMany({
    where: { eventId: eventId }
  });

  return perks.map(dbPerkToPerk);
}

async function findPerk(id: string): Promise<Perk | null> {
  return await db.perk.findUnique({
    where: { id: id }
  });
}

async function resetEventPerks(
  eventId: string,
  perks: string[],
  tx?: Prisma.TransactionClient
): Promise<void> {
  await (tx || db).perk.deleteMany({
    where: {
      id: { notIn: perks },
      eventId: eventId,
      isDefault: false
    }
  });

  await (tx || db).perk.updateMany({
    where: {
      eventId: eventId
    },
    data: {
      isEnabled: false
    }
  });
}

async function createDefaultPerks(
  eventId: string,
  language: Language
): Promise<Perk | void> {
  const perks: CreatePerksInput[] = [];

  for (const perk of json) {
    const perksId = Id();
    const perksAt = new Date();

    perks.push({
      id: perksId,
      name: perk.name[language],
      createdAt: perksAt,
      isDefault: true,
      isEnabled: true,
      eventId: eventId
    });
  }

  await db.perk.createMany({
    data: perks
  });
}

async function createPerk(perk: CreatePerksInput): Promise<Perk | void> {
  const perkId = Id();
  const perkAt = new Date();

  await db.perk.create({
    data: {
      id: perkId,
      name: perk.name,
      createdAt: perkAt,
      isDefault: perk.isDefault,
      isEnabled: perk.isEnabled,
      eventId: perk.eventId
    }
  });
}

async function createPerks(
  perks: CreatePerksInput[],
  tx?: Prisma.TransactionClient
): Promise<Perk | void> {
  await (tx || db).perk.createMany({
    data: perks
  });
}

async function enableEventPerks(
  perks: string[],
  tx?: Prisma.TransactionClient
): Promise<void> {
  await (tx || db).perk.updateMany({
    where: { id: { in: perks } },
    data: {
      isEnabled: true
    }
  });
}

export {
  createDefaultPerks,
  enableEventPerks,
  findEventPerks,
  findPerk,
  createPerk,
  createPerks,
  resetEventPerks
};
