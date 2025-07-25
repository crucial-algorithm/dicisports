import type { EventSeries, Event } from '@prisma/client';

import { db } from '~/server/db.server';

export type EventSeriesWithEvents = EventSeries & {
  events: Event[];
};

export async function findEventSeries(seriesId: string): Promise<EventSeriesWithEvents | null> {
  return db.eventSeries.findUnique({
    where: { id: seriesId },
    include: {
      events: {
        where: { status: 'published' },
        orderBy: [
          { startAt: 'desc' }
        ],
        include: {
          sport: true,
          difficulty: true
        }
      }
    }
  });
}

export async function findEventSeriesBySlug(slug: string): Promise<EventSeriesWithEvents | null> {
  return db.eventSeries.findUnique({
    where: { slug },
    include: {
      events: {
        where: { status: 'published' },
        orderBy: [
          { startAt: 'desc' }
        ],
        include: {
          sport: true,
          difficulty: true
        }
      }
    }
  });
}

export async function findAllEventSeries() {
  return db.eventSeries.findMany({
    include: {
      events: {
        where: { status: 'published' },
        orderBy: [
          { startAt: 'desc' }
        ],
        take: 1 // Just get the latest event for preview
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });
}

export async function createEventSeries(data: {
  name: string;
  slug: string;
  description?: string;
}): Promise<EventSeries> {
  return db.eventSeries.create({
    data
  });
}

export async function updateEventSeries(
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
  }
): Promise<EventSeries> {
  return db.eventSeries.update({
    where: { id },
    data
  });
}

export async function deleteEventSeries(id: string): Promise<EventSeries> {
  // First, remove series association from all events
  await db.event.updateMany({
    where: { seriesId: id },
    data: { seriesId: null, edition: null }
  });

  // Then delete the series
  return db.eventSeries.delete({
    where: { id }
  });
}

// Helper function to sort editions intelligently
export function sortEditions(events: Event[]): Event[] {
  return events.sort((a, b) => {
    const aEdition = a.edition || '';
    const bEdition = b.edition || '';
    
    // Check if editions are years (4 digits)
    const aIsYear = /^\d{4}$/.test(aEdition);
    const bIsYear = /^\d{4}$/.test(bEdition);
    
    if (aIsYear && bIsYear) {
      return parseInt(bEdition) - parseInt(aEdition); // Newest first
    }
    if (aIsYear && !bIsYear) {return -1;} // Years come first
    if (!aIsYear && bIsYear) {return 1;}
    
    // For non-year editions, sort alphabetically
    return aEdition.localeCompare(bEdition);
  });
}

// Helper function to find the latest event in a series
export function findLatestEventInSeries(events: Event[]): Event | null {
  if (events.length === 0) {
    return null;
  }
  
  const sortedEvents = sortEditions(events);
  
  // Find the event with the latest start date among the most recent editions
  const latestByDate = events
    .filter(e => e.startAt)
    .sort((a, b) => new Date(b.startAt!).getTime() - new Date(a.startAt!).getTime())[0];
  
  return latestByDate || sortedEvents[0];
}

// Helper function to check if an event is the latest in its series
export function isLatestEventInSeries(currentEvent: Event, seriesEvents: Event[]): boolean {
  const latestEvent = findLatestEventInSeries(seriesEvents);

  return latestEvent?.id === currentEvent.id;
}

// Helper function to generate series slug from name
export function generateSeriesSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}
