import { db } from '~/server/db.server';
import type { Organizer, OrganizerInput } from '~/types';
import Id from '~/server/utils/Id.server';

async function createOrganizer(
  organizer: OrganizerInput
): Promise<Organizer | void> {
  const now = new Date();

  return db.organizer.create({
    data: {
      id: organizer.id || Id(),
      name: organizer.name,
      email: organizer.email,
      phoneNumber: organizer.phoneNumber,
      address: organizer.address,
      postalCode: organizer.postalCode,
      city: organizer.city,
      description: organizer.description,
      logo: organizer.logo,
      userId: organizer.userId,
      createdAt: now,
      updatedAt: now
    }
  });
}

async function findOrganizer(userId: string): Promise<Organizer | null> {
  return db.organizer.findUnique({
    where: { userId }
  });
}

async function updateOrganizer(
  organizer: OrganizerInput
): Promise<Organizer | void> {
  const now = new Date();

  return await db.organizer.update({
    where: {
      id: organizer.id as string
    },
    data: {
      name: organizer.name,
      email: organizer.email,
      phoneNumber: organizer.phoneNumber,
      address: organizer.address,
      postalCode: organizer.postalCode,
      city: organizer.city,
      description: organizer.description,
      logo: organizer.logo,
      userId: organizer.userId,
      updatedAt: now
    }
  });
}

export { createOrganizer, findOrganizer, updateOrganizer };
