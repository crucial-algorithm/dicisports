import type { Event } from '@prisma/client';
import { Prisma, PrismaClient, Status } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type {
  CreateEventInput,
  FavoriteEvent,
  Language,
  SearchEventsResults
} from '~/types';
import {
  createDefaultPerks,
  createPerks,
  enableEventPerks,
  resetEventPerks
} from '~/server/db/perks.server';
import { generateSlug } from '~/utils/misc';
import { upsertEventCount } from '~/server/db/eventDorsalCount.server';

const prisma = new PrismaClient();

const eventWithRacesDifficultiesAndDocuments = Prisma.validator<Prisma.EventArgs>()({
  include: { races: true, difficulty: true, documents: true, eventDorsalCount: true }
});

type EventWithRacesDifficultiesAndDocuments = Prisma.EventGetPayload<typeof eventWithRacesDifficultiesAndDocuments>

async function findEvents(): Promise<Array<Event>> {
  return db.event.findMany({
    where: {
      status: { notIn: [Status.auto, Status.deleted] }
    },
    include: {
      documents: {
        where: {
          status: {
            not: Status.deleted
          }
        }
      },
      difficulty: true,
      races: true
    }
  });
}

async function findUserEvents(userId: string): Promise<Array<Event>> {
  return db.event.findMany({
    where: {
      status: { notIn: [Status.auto, Status.deleted] },
      createdById: userId
    },
    include: {
      documents: {
        where: {
          status: {
            not: Status.deleted
          }
        }
      },
      difficulty: true,
      races: true
    }
  });
}

async function findEvent(id: string): Promise<EventWithRacesDifficultiesAndDocuments | null> {
  return db.event.findUnique({
    where: { id },
    include: {
      documents: {
        where: {
          status: {
            not: Status.deleted
          }
        }
      },
      difficulty: true,
      races: true,
      eventDorsalCount: true
    }
  });
}

async function createDraftEvent(
  createdById: string,
  language: Language,
  id?: string
): Promise<Event | void> {
  const eventId = id ? id : Id();
  const eventAt = new Date();

  return await prisma.$transaction(async (tx) => {
    await tx.event.create({
      data: {
        id: eventId,
        name: null,
        sportId: 1,
        difficultyId: 1,
        startAt: eventAt,
        endAt: null,
        lat: null,
        lng: null,
        location: null,
        useExternalBooking: false,
        externalBookingUrl: null,
        createdById,
        createdAt: eventAt,
        updatedAt: eventAt
      }
    });

    await createDefaultPerks(eventId, language, tx);
    await upsertEventCount(eventId, 0, tx);
  });
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
        difficultyId: event.difficultyId,
        startAt: event.startAt,
        endAt: event.startAt,
        lat: event.lat,
        lng: event.lng,
        location: event.location,
        useExternalBooking: event.useExternalBooking,
        externalBookingUrl: event.externalBookingUrl,
        image1: event.image1,
        image2: event.image2,
        image3: event.image3,
        image4: event.image4,
        image5: event.image5,
        regulationContent: event.regulationContent,
        regulationPath: event.regulationPath,
        regulationFileName: event.regulationFileName,
        description: event.description,
        directions: event.directions,
        status: event.status
      }
    });
    await upsertEventCount(event.id, event.dorsalStartingNumber, prisma);
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
        }),
      prisma
    );
  });
}

async function publishEvent(eventId: string, name: string): Promise<void> {
  const event = await findEvent(eventId);

  if (!event) {
    return;
  }

  let slug = event.slug;

  if (slug === null) {
    slug = await assignUniqueSlug(name);
  }

  await db.event.update({
    where: { id: eventId },
    data: {
      slug,
      status: Status.published
    }
  });
}

async function unpublishEvent(eventId: string): Promise<void> {
  await db.event.update({
    where: { id: eventId },
    data: {
      status: Status.draft
    }
  });
}

async function assignUniqueSlug(name: string, attempt = 0): Promise<string> {
  const prefix = `${Math.floor(Math.random() * 1000)}-`;
  const slug = `${attempt ? prefix : ''}${generateSlug(name)}`;

  const event = await db.event.findUnique({
    where: { slug }
  });

  if (!event) {
    return slug;
  }
  return await assignUniqueSlug(name, ++attempt);
}

async function findEventBySlug(slug: string): Promise<Event | null> {
  return await db.event.findUnique({
    where: { slug },
    include: {
      documents: {
        where: {
          status: {
            not: 'deleted'
          }
        },
        orderBy: { position: 'asc' }
      },
      difficulty: true,
      races: true
    }
  });
}

async function findUserFavoriteEvents(id: string): Promise<Array<Event>> {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      favEvents: true
    }
  });

  if (!user) {
    return [];
  }

  return await db.event.findMany({
    where: { id: { in: user.favEvents.map((fe) => fe.eventId) } },
    include: {
      documents: {
        where: {
          status: {
            not: Status.deleted
          }
        }
      },
      difficulty: true,
      races: true
    }
  });
}

async function addEventToFavorites(
  userId: string,
  eventId: string
): Promise<void> {
  await db.favoriteEvent.create({
    data: {
      userId,
      eventId
    }
  });
}

async function removeEventFromFavorites(
  userId: string,
  eventId: string
): Promise<void> {
  await db.favoriteEvent.delete({
    where: { userId_eventId: { userId, eventId } }
  });
}

async function findUserFavoriteEvent(
  userId: string,
  eventId: string
): Promise<FavoriteEvent | null> {
  return await db.favoriteEvent.findUnique({
    where: { userId_eventId: { userId, eventId } }
  });
}

async function getEventResultsByName(name: string): Promise<Array<SearchEventsResults>> {
  const searchTerm = `%${name.length ? name : ''}%`;

  return await db.$queryRaw`
    SELECT name, slug, image1, image2, image3, image4, image5
    FROM events
    WHERE name ILIKE ${searchTerm}
      AND status = 'published';
  `;
}

async function deleteEvent(id: string) {
  return await db.event.update({
    where: { id },
    data: {
      status: Status.deleted
    }
  });
}

async function updateEventRegulation({
  eventId,
  regulationPath,
  regulationContent,
  regulationFileName
}: {
  eventId: string;
  regulationPath: string | null;
  regulationContent: string | null;
  regulationFileName: string | null;
}): Promise<void> {
  await db.event.update({
    where: {
      id: eventId
    },
    data: {
      regulationContent,
      regulationPath,
      regulationFileName
    }
  });
}

export type {
  EventWithRacesDifficultiesAndDocuments
};

export {
  findEvents,
  findUserEvents,
  findEvent,
  createDraftEvent,
  updateEvent,
  publishEvent,
  unpublishEvent,
  findEventBySlug,
  addEventToFavorites,
  removeEventFromFavorites,
  findUserFavoriteEvents,
  findUserFavoriteEvent,
  getEventResultsByName,
  deleteEvent,
  updateEventRegulation
};
