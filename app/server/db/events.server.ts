import type { Event } from '@prisma/client';
import { Status } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type { CreateEventInput, CreatePerksInput } from '~/types';
import {
  createDefaultPerks,
  createPerk,
  createPerks,
  enableEventPerks,
  resetEventPerks
} from '~/server/db/perks.server';

const prisma = new PrismaClient();

async function findEvents(): Promise<Array<Event>> {
  return db.event.findMany({
    where: {
      name: { not: Status.draft }
    }
  });
}

async function findEvent(id: string): Promise<Event | null> {
  return db.event.findUnique({
    where: { id },
    include: { documents: true }
  });
}

async function createDraftEvent(id?: string): Promise<Event | void> {
  const eventId = id ? id : Id();
  const eventAt = new Date();

  await db.event.create({
    data: {
      id: eventId,
      name: null,
      sportId: 1,
      startAt: null,
      endAt: null,
      location: null,
      address: null,
      useExternalBooking: false,
      externalBookingUrl: null,
      createdAt: eventAt,
      updatedAt: eventAt
    }
  });

  await createDefaultPerks(eventId);
}

async function updateEvent(
  event: CreateEventInput,
  perks: string[],
  newPerks: string[]
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    await prisma.event.update({
      where: { id: event.id },
      data: {
        name: event.name,
        sportId: event.sportId,
        startAt: event.startAt,
        endAt: event.startAt,
        location: event.location,
        address: event.address,
        useExternalBooking: event.useExternalBooking,
        externalBookingUrl: event.externalBookingUrl,
        image1: event.image1,
        image2: event.image2,
        image3: event.image3,
        image4: event.image4,
        image5: event.image5,
        eventDescription: event.eventDescription,
        status: Status.draft
      }
    });
    await resetEventPerks(event.id, perks);
    await enableEventPerks(perks);
    await createPerks(
      newPerks.filter((name) => !!name).map((p) => {
        return {
          id: Id(),
          name: p,
          isDefault: false,
          isEnabled: true,
          eventId: event.id
        };
      })
    );
  });
}

export { findEvents, findEvent, createDraftEvent, updateEvent };
