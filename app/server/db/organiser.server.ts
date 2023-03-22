import { db } from '~/server/db.server';
import type { InputOrganiser, Organiser } from '~/types';
import Id from '~/server/utils/Id.server';

async function createOrganiser(organiser: InputOrganiser): Promise<void> {
  const now = new Date();

  return db.organiser.create({
    data: {
      id: Id(),
      name: organiser.name,
      email: organiser.email,
      phoneNumber: organiser.phoneNumber,
      address: organiser.address,
      postalCode: organiser.postalCode,
      city: organiser.city,
      description: organiser.description,
      logo: organiser.logo,
      userId: organiser.userId,
      createdAt: now,
      updatedAt: now
    }
  });
}

async function findOrganiser(userId: string): Promise<Organiser | null> {
    return db.organiser.findUnique({
      where: { userId }
    });
}

export { createOrganiser, findOrganiser };