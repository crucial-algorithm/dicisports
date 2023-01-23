import type { CheckoutStatus, Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type {
  Booking,
  Cart,
  DBRawCart,
  DBRawRaceCheckout,
  DBRawRaceQtd,
  PartialRaceCheckout,
  Participant,
  ParticipantInput,
  Race,
  RaceCheckout,
  RaceCheckoutInput,
  RaceParticipant,
  RaceParticipantInput,
  RaceQtd,
  ShirtSize
} from '~/types';
import {
  dbCartToCart,
  dbEventRaceCheckoutQtdToEventRaceCheckoutQtd,
  dbRaceCheckoutToRaceCheckout,
  dbShirtSizeToShirtSize
} from '~/server/db/codecs.server';
import { findEventRaces } from '~/server/db/races.server';

const prisma = new PrismaClient();

async function createRegistration(
  raceCheckout: RaceCheckoutInput,
  tx?: Prisma.TransactionClient
): Promise<RaceCheckout> {
  const checkoutId = raceCheckout.id || Id();
  const checkoutAt = new Date();

  return await (tx || db).raceCheckout.create({
    data: {
      id: checkoutId,
      raceId: raceCheckout.raceId,
      userId: raceCheckout.userId,
      qtd: raceCheckout.qtd,
      createdAt: checkoutAt,
      updatedAt: checkoutAt
    }
  });
}

async function getUserEventRegistrations(
  userSessionId: string,
  eventId: string
): Promise<RaceCheckout[] | null> {
  const eventRaces: Array<Race> = (await findEventRaces(eventId)) as Race[];

  return await db.raceCheckout.findMany({
    where: {
      userId: userSessionId,
      raceId: { in: eventRaces.map((r) => r.id) }
    }
  });
}

async function getCheckoutByUserAndRace(
  userId: string,
  raceId: string
): Promise<RaceCheckout | null> {
  return await db.raceCheckout.findUnique({
    where: { userId_raceId: { userId, raceId } }
  });
}

async function addRegistration(
  clientId: string,
  raceId: string,
  tx?: Prisma.TransactionClient
): Promise<RaceCheckout> {
  const now = new Date();

  return await (tx || db).raceCheckout.upsert({
    where: {
      userId_raceId: { userId: clientId, raceId }
    },
    update: {
      qtd: { increment: 1 }
    },
    create: {
      id: Id(),
      raceId: raceId,
      userId: clientId,
      qtd: 1,
      createdAt: now,
      updatedAt: now
    }
  });
}

async function removeRegistration(
  userSessionId: string,
  raceId: string,
  tx?: Prisma.TransactionClient
): Promise<RaceCheckout | null> {
  const existingCheckout = await getCheckoutByUserAndRace(
    userSessionId,
    raceId
  );

  if (!existingCheckout || existingCheckout.qtd === 0) {
    return null;
  }

  if (existingCheckout.qtd === 1) {
    return await (tx || db).raceCheckout.delete({
      where: { userId_raceId: { userId: userSessionId, raceId } }
    });
  }

  return await (tx || db).raceCheckout.update({
    where: { userId_raceId: { userId: userSessionId, raceId } },
    data: {
      qtd: existingCheckout.qtd - 1
    }
  });
}

async function getUserCheckoutRaces(
  userSessionId: string,
  eventId: string
): Promise<Cart[]> {
  const query = `
        SELECT race_checkout.id as checkout_id,
               qtd,
               r.name           as race_name,
               r.price          as race_price,
               r.display_order
        FROM race_checkout
                 LEFT JOIN races r ON r.id = race_checkout.race_id
        WHERE user_id = '${userSessionId}'
          AND r.event_id = '${eventId}';
    `;

  const results: Array<DBRawCart> = await db.$queryRawUnsafe(query);

  return results.map(dbCartToCart);
}

async function findEventRacesCheckoutQtd(
  eventId: string,
  userSessionId: string
): Promise<RaceQtd[] | null> {
  const query = `
        SELECT r.id,
               r.name,
               r.distance,
               r.start_time,
               r.price,
               r.display_order,
               CASE WHEN rc.qtd IS NULL THEN 0 ELSE rc.qtd END qtd
        FROM races r
                 LEFT JOIN race_checkout rc on r.id = rc.race_id AND rc.user_id = '${userSessionId}'
        WHERE event_id = '${eventId}';
    `;

  const results: Array<DBRawRaceQtd> = await db.$queryRawUnsafe(query);

  return results.map(dbEventRaceCheckoutQtdToEventRaceCheckoutQtd);
}

async function getDistinctUserEventCheckoutRaces(
  userSessionId: string,
  eventId: string
): Promise<Array<PartialRaceCheckout> | null> {
  const query = `
        SELECT id, race_id, user_id, created_at, updated_at
        FROM race_checkout, generate_series(1, qtd)
        WHERE user_id = '${userSessionId}'
          and race_id IN (SELECT id FROM races WHERE event_id = '${eventId}');
    `;

  const results: Array<DBRawRaceCheckout> = await db.$queryRawUnsafe(query);

  return results.map(dbRaceCheckoutToRaceCheckout);
}

async function createParticipant(
  clientId: string,
  tx?: Prisma.TransactionClient
): Promise<Participant> {
  return await (tx || db).participant.create({
    data: {
      id: Id(),
      userId: clientId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}

async function addParticipantsToRace(
  raceIds: string[],
  clientId: string,
  bookingId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    const raceParticipants: RaceParticipantInput[] = [];

    for (const r of raceIds) {
      const id = Id();
      const now = new Date();

      const participant = await createParticipant(clientId, tx || prisma);

      raceParticipants.push({
        id: id,
        participantId: participant.id,
        raceId: r,
        bookingId: bookingId,
        createdAt: now,
        updatedAt: now
      });
    }

    await (tx || prisma).raceParticipant.createMany({
      data: raceParticipants
    });
  });
}

async function findUserParticipants(
  userSessionId: string
): Promise<Participant[]> {
  return await db.participant.findMany({
    where: {
      userId: userSessionId
    }
  });
}

async function findUserRaceParticipants(
  userSessionId: string,
  eventId: string
): Promise<RaceParticipant[] | null> {
  const eventRaces = await findEventRaces(eventId);
  const userParticipants = await findUserParticipants(userSessionId);

  return await db.raceParticipant.findMany({
    where: {
      participantId: { in: userParticipants.map((p) => p.id) },
      raceId: { in: eventRaces?.map((e) => e.id) }
    },
    include: {
      race: true,
      participant: true
    }
  });
}

async function updateParticipant(
  participant: ParticipantInput
): Promise<Participant> {
  return await db.participant.update({
    where: { id: participant.id },
    data: {
      firstName: participant.firstName,
      lastName: participant.lastName,
      gender: participant.gender,
      birthday: participant.birthday,
      phoneNumber: participant.phoneNumber,
      identityCard: participant.identityCard,
      federationNumber: participant.federationNumber,
      shirtSize: participant.shirtSize,
      nationality: participant.nationality,
      postalCode: participant.postalCode,
      status: 'saved'
    }
  });
}

async function updateToSelectedParticipant(
  oldParticipant: string,
  savedParticipant: string,
  raceId: string
): Promise<void> {
  await prisma.raceParticipant.update({
    where: {
      participantId_raceId: { participantId: oldParticipant, raceId }
    },
    data: {
      participantId: savedParticipant
    }
  });
}

async function removeRaceParticipant(
  participantId: string,
  raceId: string,
  userSessionId: string
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    await prisma.raceParticipant.delete({
      where: {
        participantId_raceId: { participantId, raceId }
      }
    });

    await removeRegistration(userSessionId, raceId, prisma);
  });
}

async function addRaceParticipants(
  raceIds: string[],
  userSessionId: string,
  registrationId: string
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    await addParticipantsToRace(raceIds, userSessionId, registrationId, prisma);

    for (const r of raceIds) {
      await addRegistration(userSessionId, r, prisma);
    }
  });
}

async function updateBookingStatus(
  raceParticipants: RaceParticipant[],
  status: CheckoutStatus,
  userSessionId: string,
  eventId: string
): Promise<Booking> {
  return await db.booking.update({
    where: { eventId_userId: { eventId, userId: userSessionId } },
    data: {
      status
    }
  });
}

async function findBooking(
  userSessionId: string,
  eventId: string
): Promise<Booking | null> {
  return db.booking.findUnique({
    where: { eventId_userId: { eventId, userId: userSessionId } }
  });
}

async function findBookings(userSessionId: string): Promise<Booking[] | null> {
  return db.booking.findMany({
    where: { userId: userSessionId }
  });
}

async function createBooking(
  pin: number,
  eventId: string,
  userSessionId: string
): Promise<Booking> {
  return await db.booking.create({
    data: {
      id: Id(),
      pin,
      eventId,
      userId: userSessionId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
}

async function removeBooking(
  userSessionId: string,
  eventId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  await (tx || db).booking.delete({
    where: { eventId_userId: { eventId, userId: userSessionId } }
  });
}

async function findShirtSizes(): Promise<Array<ShirtSize>> {
  const shirtSizes = await db.shirtSize.findMany({
    orderBy: {
      id: 'asc'
    }
  });

  return shirtSizes.map(dbShirtSizeToShirtSize);
}

async function changeCheckoutToAuthUser(
  authUser: string,
  oldUser: string
): Promise<void> {
  return prisma.$transaction(async (prisma) => {
    await findUserParticipants(oldUser);
    await findBookings(oldUser);

    await prisma.booking.updateMany({
      where: {
        userId: oldUser
      },
      data: {
        userId: authUser
      }
    });

    await prisma.participant.updateMany({
      where: {
        userId: oldUser
      },
      data: {
        userId: authUser
      }
    });

    await prisma.raceCheckout.updateMany({
      where: {
        userId: oldUser
      },
      data: {
        userId: authUser
      }
    });
  });
}

export {
  createRegistration,
  getUserEventRegistrations,
  addRegistration,
  removeRegistration,
  getUserCheckoutRaces,
  findEventRacesCheckoutQtd,
  getCheckoutByUserAndRace,
  addParticipantsToRace,
  getDistinctUserEventCheckoutRaces,
  findUserRaceParticipants,
  findUserParticipants,
  updateParticipant,
  updateToSelectedParticipant,
  removeRaceParticipant,
  addRaceParticipants,
  updateBookingStatus,
  findBooking,
  createBooking,
  findShirtSizes,
  removeBooking,
  changeCheckoutToAuthUser
};
