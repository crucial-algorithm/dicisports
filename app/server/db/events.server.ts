import type { Event } from '@prisma/client';
import { Status } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import { CreateEventInput } from '~/types';

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

async function createDraftEvent(id?: string): Promise<Event | null> {
  const eventId = id ? id : Id();
  const eventAt = new Date();

  return db.event.create({
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
}

async function updateEvent(event: CreateEventInput): Promise<void> {
  await db.event.update({
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
      status: Status.draft
    }
  });
}

export { findEvents, findEvent, createDraftEvent, updateEvent };
