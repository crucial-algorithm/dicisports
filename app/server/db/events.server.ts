import type { Event } from '@prisma/client';
import { PrismaClient, Status } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type { CreateEventInput, Language } from '~/types';
import {
  createDefaultPerks,
  createPerks,
  enableEventPerks,
  resetEventPerks
} from '~/server/db/perks.server';

const prisma = new PrismaClient();

async function findEvents(): Promise<Array<Event>> {
  return db.event.findMany({
    where: {
      status: { not: Status.auto }
    }
  });
}

async function findEvent(id: string): Promise<Event | null> {
  return db.event.findUnique({
    where: { id },
    include: {
      documents: {
        where: {
          status: {
            not: 'deleted'
          }
        }
      }
    }
  });
}

async function createDraftEvent(
  language: Language,
  id?: string
): Promise<Event | void> {
  const eventId = id ? id : Id();
  const eventAt = new Date();

  await db.event.create({
    data: {
      id: eventId,
      name: null,
      sportId: 1,
      startAt: eventAt,
      endAt: null,
      location: null,
      address: null,
      useExternalBooking: false,
      externalBookingUrl: null,
      createdAt: eventAt,
      updatedAt: eventAt
    }
  });

  await createDefaultPerks(eventId, language);
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
        directions: event.directions,
        status: Status.draft
      }
    });
    await resetEventPerks(event.id, perks, prisma);
    await enableEventPerks(perks, prisma);
    await createPerks(
      newPerks
        .filter((name) => !!name)
        .map((p) => {
          return {
            id: Id(),
            name: p,
            isDefault: false,
            isEnabled: true,
            eventId: event.id
          };
        }), prisma
    );
  });
}

export { findEvents, findEvent, createDraftEvent, updateEvent };
