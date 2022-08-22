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

async function deletePerks(eventId: string): Promise<void> {
  await db.perks.deleteMany({
    where: { eventId: eventId, isEnabled: false }
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

async function createPerks(
  perks: CreatePerksInput
): Promise<Perks | void> {
  const perksId = Id();
  const perksAt = new Date();

  await db.perks.create({
    data: {
      id: perksId,
      name: perks.name,
      createdAt: perksAt,
      isDefault: perks.isDefault,
      isEnabled: perks.isEnabled,
      eventId: perks.eventId
    }
  });
}

async function updatePerks(perks: CreatePerksInput): Promise<void> {
  await db.perks.update({
    where: { id: perks.id },
    data: {
      name: perks.name,
      createdAt: perks.createdAt,
      isDefault: perks.isDefault,
      isEnabled: perks.isEnabled,
      eventId: perks.eventId
    }
  });
}

export {
  createDefaultPerks,
  updatePerks,
  findEventPerks,
  findPerk,
  createPerks,
  deletePerks
};
