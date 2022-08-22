import type { Perks } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type { CreatePerksInput } from '~/types';
import { dbPerkToPerk } from '~/server/db/codecs.server';

import json from './perks.json';

async function findEventPerks(eventId: string): Promise<Array<Perks>> {
  const perks = await db.perks.findMany({
    where: { eventId: eventId }
  });

  return perks.map(dbPerkToPerk);
}

async function findPerk(id: string): Promise<Perks | null> {
  return await db.perks.findUnique({
    where: { id: id }
  });
}

async function resetEventPerks(eventId: string): Promise<void> {
  await db.perks.deleteMany({
    where: {
      eventId: eventId,
      isDefault: false
    }
  });

  await db.perks.updateMany({
    where: {
      eventId: eventId
    },
    data: {
      isEnabled: false
    }
  });
}

async function createDefaultPerks(eventId: string): Promise<Perks | void> {
  for (const perks of json) {
    const perksId = Id();
    const perksAt = new Date();

    await db.perks.create({
      data: {
        id: perksId,
        name: perks.name.en,
        createdAt: perksAt,
        isDefault: true,
        isEnabled: false,
        eventId: eventId
      }
    });
  }
}

async function createPerk(perk: CreatePerksInput): Promise<Perks | void> {
  const perkId = Id();
  const perkAt = new Date();

  await db.perks.create({
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

async function enableEventPerks(perks: string[]): Promise<void> {
  for (const p of perks) {
    await db.perks.update({
      where: { id: p },
      data: {
        isEnabled: true
      }
    });
  }
}

export {
  createDefaultPerks,
  enableEventPerks,
  findEventPerks,
  findPerk,
  createPerk,
  resetEventPerks
};
