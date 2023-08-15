import { OrganizerStatus } from '@prisma/client';

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

async function findSubmittedOrganizers(): Promise<Organizer[]> {
  return await db.organizer.findMany({
    where: {
      status: OrganizerStatus.PENDING
    }
  });
}

async function findOrganizerById(id: string): Promise<Organizer | null> {
  return await db.organizer.findUnique({
    where: { id }
  });
}

async function approveOrganizer(id: string, commission: number) {
  return db.organizer.update({
    where: { id },
    data: {
      status: OrganizerStatus.APPROVED,
      commission
    }
  });
}

async function rejectOrganizer(id: string) {
  return db.organizer.update({
    where: { id },
    data: {
      status: OrganizerStatus.REJECTED
    }
  });
}

export {
  createOrganizer,
  findOrganizer,
  updateOrganizer,
  findSubmittedOrganizers,
  findOrganizerById,
  approveOrganizer,
  rejectOrganizer
};
