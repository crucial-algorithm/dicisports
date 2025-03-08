import { OrganizerStatus, Role } from '@prisma/client';
import type { Organizer } from '@prisma/client';

import { db } from '~/server/db.server';
import type { OrganizerInput } from '~/types';
import Id from '~/server/utils/Id.server';

async function createOrganizer(organizer: OrganizerInput): Promise<Organizer> {
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
      taxNumber: organizer.taxNumber,
      contactName: organizer.contactName,
      typeId: organizer.typeId,
      description: organizer.description,
      logo: organizer.logo,
      userId: organizer.userId,
      createdAt: now,
      updatedAt: now,
      status: organizer.status || OrganizerStatus.PENDING
    }
  });
}

async function findOrganizer(userId: string): Promise<Organizer | null> {
  return db.organizer.findUnique({
    where: { userId }
  });
}

async function findOrganizerByName(name: string) {
  return db.organizer.findFirst({
    where: { name }
  });
}

async function findOrganizers(): Promise<Organizer[]> {
  return db.organizer.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });
}

async function findOrganizerById(id: string): Promise<Organizer | null> {
  const organizer = await db.organizer.findUnique({
    where: { id }
  });

  if (!organizer) {
    return null;
  }

  return {
    ...organizer,
    commission: organizer.commission ? organizer.commission / 1000 : null
  };
}


async function updateOrganizer(
  organizer: OrganizerInput
): Promise<Organizer | undefined> {
  const now = new Date();

  return db.organizer.update({
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
      taxNumber: organizer.taxNumber,
      contactName: organizer.contactName,
      typeId: organizer.typeId,
      description: organizer.description,
      logo: organizer.logo,
      userId: organizer.userId,
      updatedAt: now
    }
  });
}

async function approveOrganizer(id: string, commission: number) {
  return await db.$transaction(async (tx) => {
    const organizer = await tx.organizer.update({
      where: { id },
      data: {
        status: OrganizerStatus.APPROVED,
        commission: commission * 1000
      }
    });

    await tx.user.update({
      where: {
        id: organizer.userId
      },
      data: {
        role: Role.ORGANIZER
      }
    });
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

async function updateOrganizerCommission(id: string, commission: number) {
  return db.organizer.update({
    where: {
      id
    },
    data: {
      commission: commission * 1000
    }
  });
}

export {
  createOrganizer,
  findOrganizer,
  findOrganizerByName,
  updateOrganizer,
  findOrganizers,
  findOrganizerById,
  approveOrganizer,
  rejectOrganizer,
  updateOrganizerCommission
};
