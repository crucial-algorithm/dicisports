import type { Event, FavoriteEvent, Organizer } from '@prisma/client';
import { Prisma, PrismaClient, Status } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type { CreateEventInput, EventWithRacesDifficultiesAndDocuments, Language } from '~/types';
import {
  createDefaultPerks,
  createPerks,
  enableEventPerks,
  resetEventPerks
} from '~/server/db/perks.server';
import { generateSlug } from '~/utils/misc';
import {
  createEventLatestBibNumber,
  updateEventLatestBibNumber
} from '~/server/db/latestBibNumber.server';

const prisma = new PrismaClient();

const eventWithDocuments = Prisma.validator<Prisma.EventArgs>()({
  include: { documents: true }
});

const searchEventResults = Prisma.validator<Prisma.EventArgs>()({
  select: {
    name: true,
    slug: true,
    image1: true,
    image2: true,
    image3: true,
    image4: true,
    image5: true
  }
});


const findEventSlimResult = Prisma.validator<Prisma.EventArgs>()({
  select: {
    id: true,
    startAt: true,
    name: true,
    slug: true,
    location: true,
    placeName: true
  }
});


type EventWithDocuments = Prisma.EventGetPayload<typeof eventWithDocuments>;
type SearchEventResults = Prisma.EventGetPayload<typeof searchEventResults>;
type EventSlim = Prisma.EventGetPayload<typeof findEventSlimResult>;

async function findEvents(): Promise<
  Array<EventWithRacesDifficultiesAndDocuments>
> {
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

async function areThereTracesOfUserEventHandling(
  userId: string,
  lastNumberOfdays = 7
): Promise<boolean> {
  const events = await db.event.findMany({
    where: {
      createdById: userId,
      createdAt: {
        gte: new Date(Date.now() - lastNumberOfdays * 3600 * 24000)
      }
    }
  });

  return events.length > 0;
}

async function findOrganizerEvents(organizerId: string): Promise<Array<Event>> {
  const o = await db.organizer.findUnique({ where: { id: organizerId } });

  if (!o) {
    return [];
  }

  return db.event.findMany({
    where: {
      status: { notIn: [Status.auto, Status.deleted] },
      createdById: o.userId
    },
    orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }]
  });
}

async function findEventOrganizer(eventId: string): Promise<Organizer | null> {
  const event = await db.event.findUnique({ where: { id: eventId } });

  if (!event) {
    return null;
  }

  const user = await db.user.findUnique({ where: { id: event.createdById } });

  if (!user) {
    return null;
  }

  return db.organizer.findUnique({ where: { userId: user.id } });
}

async function findPublishedEvents(): Promise<Event[]> {
  return db.event.findMany({
    where: {
      status: Status.published
    }
  });
}

async function findPublishedEventsSlim(): Promise<EventSlim[]> {
  return db.event.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      startAt: true,
      location: true,
      placeName: true
    },
    where: {
      status: Status.published,
      startAt: { gte: new Date() }
    },
    orderBy: { startAt: 'asc' }
  });
}

/**
 * Used to get the latest event for highlight in home page
 */
async function findLatestPublishedEvents(): Promise<Event[]> {
  return db.event.findMany({
    where: {
      status: Status.published,
      hideFromLatestEvents: false,
      endAt: { gte: new Date() }
    },
    orderBy: { createdAt: 'desc' },
    take: 12
  });
}

/**
 * Used to get the events that have bookings with us, and have at least 3 images
 */
async function findFeaturedEvents(): Promise<Event[]> {
  const events = await db.event.findMany({
    where: {
      status: Status.published,
      hideFromLatestEvents: false,
      endAt: { gte: new Date() },
      useExternalBooking: false
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Number of potential featured events count', events.length);

  const eventsWith3Images = events.filter(
    ({ image1, image2, image3, image4, image5 }) => {
      const filledCount = [image1, image2, image3, image4, image5].filter(
        Boolean
      ).length;

      return filledCount >= 3;
    }
  );

  console.log(
    'Number of events elegible for featured',
    eventsWith3Images.length
  );

  return eventsWith3Images;
}

async function findUserEvents(
  userId: string
): Promise<Array<EventWithDocuments>> {
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
      }
    }
  });
}

async function findEvent(id: string): Promise<EventWithDocuments | null> {
  return db.event.findUnique({
    where: { id },
    include: {
      documents: {
        where: {
          status: {
            not: Status.deleted
          }
        }
      }
    }
  });
}

async function findEventWithRacesAndDocuments(
  id: string
): Promise<EventWithRacesDifficultiesAndDocuments | null> {
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
      races: {
        where: {
          status: {
            not: Status.deleted
          }
        }
      }
    }
  });
}

async function findRegionsWithEvents(): Promise<
  { region: string; events: number }[]
> {
  return (
    await db.$queryRawUnsafe<{ region: string; events: number }[]>(`
    SELECT location->>'region' as region, count(1) as events 
    FROM events
      WHERE location->>'region' IS NOT NULL AND status = 'published'
    GROUP BY 1`)
  ).map(({ region, events }) => ({ region, events: Number(events) }));
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
        location: Prisma.DbNull,
        useExternalBooking: false,
        externalBookingUrl: null,
        createdById,
        createdAt: eventAt,
        updatedAt: eventAt
      }
    });

    await createDefaultPerks(eventId, language, tx);
    await createEventLatestBibNumber(eventId, tx);
  });
}

async function updateEvent(
  event: CreateEventInput,
  perks: string[],
  newPerks: string[],
  hasRegistrations: boolean = false
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    console.debug('updating event...');
    const startAt = new Date(event.startAt as Date);
    // We are saving date at 00:00, so add another 12H to "handle" time zone
    const eventAt = new Date(startAt.setHours(startAt.getHours() + 12));

    if (!event.id) {
      return;
    }

    await prisma.event.update({
      where: { id: event.id },
      data: {
        name: event.name,
        sportId: event.sportId,
        difficultyId: event.difficultyId,
        startAt: eventAt,
        endAt: eventAt,
        lat: event.lat,
        lng: event.lng,
        location: event.location ? event.location : Prisma.DbNull,
        placeName: event.placeName,
        useExternalBooking: event.useExternalBooking,
        externalBookingUrl: event.externalBookingUrl,
        bookingStopsAt: event.bookingStopsAt,
        image1: event.image1,
        image2: event.image2,
        image3: event.image3,
        image4: event.image4,
        image5: event.image5,
        externalWebsite: event.externalWebsite,
        regulationContent: event.regulationContent,
        regulationPath: event.regulationPath,
        regulationFileName: event.regulationFileName,
        description: event.description,
        directions: event.directions,
        bibStartingNumber: event.bibStartingNumber,
        status: event.status
      }
    });
    console.debug('event updated...');

    await resetEventPerks(event.id, perks, prisma);
    console.debug('perks reset...');

    await enableEventPerks(perks, prisma);
    console.debug('perks enabled...');

    await createPerks(
      newPerks
        .filter((name) => !!name)
        .map((p) => {
          return {
            id: Id(),
            name: p,
            isDefault: false,
            isEnabled: true,
            eventId: event.id || ''
          };
        }),
      prisma
    );
    console.debug('perks created...');

    // Only update the latest bib number when there are no registrations
    if (!hasRegistrations) {
      await updateEventLatestBibNumber(
        event.id || '',
        event.bibStartingNumber ? event.bibStartingNumber - 1 : 0,
        prisma
      );
    }
    console.debug('latest bib number updated...');
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

async function findEventBySlug(
  slug: string
): Promise<EventWithRacesDifficultiesAndDocuments | null> {
  return db.event.findUnique({
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

async function findUserFavoriteEvents(
  id: string
): Promise<Array<EventWithRacesDifficultiesAndDocuments>> {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      favEvents: true
    }
  });

  if (!user) {
    return [];
  }

  return db.event.findMany({
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
  return db.favoriteEvent.findUnique({
    where: { userId_eventId: { userId, eventId } }
  });
}

async function getEventResultsByName(
  name: string
): Promise<Array<SearchEventResults>> {
  return db.event.findMany({
    select: {
      name: true,
      slug: true,
      image1: true,
      image2: true,
      image3: true,
      image4: true,
      image5: true
    },
    where: {
      name: {
        contains: name && name.length ? name : '',
        mode: 'insensitive'
      },
      status: Status.published
    }
  });
}

async function deleteEvent(id: string) {
  return db.event.update({
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
  EventWithRacesDifficultiesAndDocuments,
  EventWithDocuments,
  SearchEventResults,
  EventSlim
};

export {
  findEvents,
  findOrganizerEvents,
  findEventOrganizer,
  findUserEvents,
  findEvent,
  findEventWithRacesAndDocuments,
  findPublishedEvents,
  findPublishedEventsSlim,
  findLatestPublishedEvents,
  findFeaturedEvents,
  findEventBySlug,
  findRegionsWithEvents,
  createDraftEvent,
  updateEvent,
  publishEvent,
  unpublishEvent,
  addEventToFavorites,
  removeEventFromFavorites,
  findUserFavoriteEvents,
  findUserFavoriteEvent,
  getEventResultsByName,
  deleteEvent,
  updateEventRegulation,
  areThereTracesOfUserEventHandling
};
