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
  console.log(event);
  await db.event.update({
    where: { id: event.id },
    data: {
      name: event.name,
      sportId: event.sportId,
      startAt: new Date().toISOString(), // TODO: Adicionar um date picker
      endAt: new Date().toISOString(), // TODO: usar a mesma data do start date
      location: event.location,
      address: event.address,
      useExternalBooking: event.useExternalBooking,
      externalBookingUrl: event.externalBookingUrl,
      status: Status.draft
    }
  });
}

export { findEvents, findEvent, createDraftEvent, updateEvent };
