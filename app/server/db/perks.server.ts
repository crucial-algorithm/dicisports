import type { Perks } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type { CreatePerksInput } from '~/types';

import json from './perks.json';

async function createPerksDefault(eventId: string): Promise<Perks | void> {
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

export { createPerksDefault, updatePerks };
