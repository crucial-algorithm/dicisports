import type { CheckoutStatus, Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type {
  Booking,
  UICartRow,
  DBRawUICartRow,
  DBRawCart,
  DBRawRaceQtd,
  PartialRaceCheckout,
  Participant,
  ParticipantInput,
  Race,
  Cart,
  CartInput,
  RaceParticipant,
  RaceParticipantInput,
  RaceQtd,
  ShirtSize
} from '~/types';
import {
  dbUICartToUICart,
  dbEventRaceCheckoutQtdToEventRaceCheckoutQtd,
  dbCartToCart,
  dbShirtSizeToShirtSize
} from '~/server/db/codecs.server';
import { findEventRaces } from '~/server/db/races.server';

const prisma = new PrismaClient();

async function createRegistration(
  cart: CartInput,
  tx?: Prisma.TransactionClient
): Promise<Cart> {
  const checkoutId = cart.id || Id();
  const checkoutAt = new Date();

  return await (tx || db).cart.create({
    data: {
      id: checkoutId,
      raceId: cart.raceId,
      userId: cart.userId,
      qtd: cart.qtd,
      createdAt: checkoutAt,
      updatedAt: checkoutAt
    }
  });
}

async function getUserEventRegistrations(
  userSessionId: string,
  eventId: string
): Promise<Cart[] | null> {
  const eventRaces: Array<Race> = (await findEventRaces(eventId)) as Race[];

  return await db.cart.findMany({
    where: {
      userId: userSessionId,
      raceId: { in: eventRaces.map((r) => r.id) }
    }
  });
}

async function getCheckoutByUserAndRace(
  userId: string,
  raceId: string
): Promise<Cart | null> {
  return await db.cart.findUnique({
    where: { userId_raceId: { userId, raceId } }
  });
}

async function addRegistration(
  clientId: string,
  raceId: string,
  tx?: Prisma.TransactionClient
): Promise<Cart> {
  const now = new Date();

  return await (tx || db).cart.upsert({
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

async function addRegistrationOnUpdateCart(
  clientId: string,
  raceId: string,
  bookingId: string
): Promise<Cart> {
  return await prisma.$transaction(async (prisma) => {
    await addParticipantToRace(clientId, raceId, bookingId, prisma);
    return await addRegistration(clientId, raceId, prisma);
  });
}

async function removeRegistration(
  clientId: string,
  raceId: string,
  tx?: Prisma.TransactionClient
): Promise<Cart | null> {
  const existingCheckout = await getCheckoutByUserAndRace(clientId, raceId);

  if (!existingCheckout || existingCheckout.qtd === 0) {
    return null;
  }

  if (existingCheckout.qtd === 1) {
    return await (tx || db).cart.delete({
      where: { userId_raceId: { userId: clientId, raceId } }
    });
  }

  return await (tx || db).cart.update({
    where: { userId_raceId: { userId: clientId, raceId } },
    data: {
      qtd: existingCheckout.qtd - 1
    }
  });
}

async function getUserCheckoutRaces(
  userSessionId: string,
  eventId: string
): Promise<UICartRow[]> {
  const query = `
        SELECT carts.id as checkout_id,
               qtd,
               r.name           as race_name,
               r.price          as race_price,
               r.display_order
        FROM carts
                 LEFT JOIN races r ON r.id = carts.race_id
        WHERE user_id = '${userSessionId}'
          AND r.event_id = '${eventId}';
    `;

  const results: Array<DBRawUICartRow> = await db.$queryRawUnsafe(query);

  return results.map(dbUICartToUICart);
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
               CASE WHEN c.qtd IS NULL THEN 0 ELSE c.qtd END qtd
        FROM races r
                 LEFT JOIN carts c on r.id = c.race_id AND c.user_id = '${userSessionId}'
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
        FROM carts, generate_series(1, qtd)
        WHERE user_id = '${userSessionId}'
          and race_id IN (SELECT id FROM races WHERE event_id = '${eventId}');
    `;

  const results: Array<DBRawCart> = await db.$queryRawUnsafe(query);

  return results.map(dbCartToCart);
}

// Participant
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

// Participant
async function addParticipantsToRace(
  raceIds: string[],
  clientId: string,
  bookingId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    const raceParticipants: RaceParticipantInput[] = await Promise.all(
      raceIds.map(async (r) => {
        const id = Id();
        const now = new Date();

        const participant = await createParticipant(clientId, tx || prisma);

        return {
          id: id,
          participantId: participant.id,
          raceId: r,
          bookingId: bookingId,
          createdAt: now,
          updatedAt: now
        };
      })
    );

    await (tx || prisma).raceParticipant.createMany({
      data: raceParticipants
    });
  });
}

// Participant
async function addParticipantToRace(
  clientId: string,
  raceId: string,
  bookingId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    const now = new Date();

    const participant = await createParticipant(clientId, tx || prisma);

    await (tx || prisma).raceParticipant.create({
      data: {
        id: Id(),
        participantId: participant.id,
        raceId,
        bookingId,
        createdAt: now,
        updatedAt: now
      }
    });
  });
}

// Participant
async function findUserParticipants(
  userSessionId: string
): Promise<Participant[]> {
  return await db.participant.findMany({
    where: {
      userId: userSessionId
    }
  });
}

// Participant
async function findUserEventRaceParticipants(
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

// Participant
async function findUserRaceParticipants(
  clientId: string,
  raceId: string
): Promise<RaceParticipant[] | null> {
  const userParticipants = await findUserParticipants(clientId);

  return await db.raceParticipant.findMany({
    where: {
      participantId: { in: userParticipants.map((p) => p.id) },
      raceId
    },
    include: {
      race: true,
      participant: true
    }
  });
}

// Participant
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

// Participant
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

// Participant
async function removeRaceParticipant(
  participantId: string,
  raceId: string,
  clientId: string
): Promise<Cart | null> {
  return await prisma.$transaction(async (prisma) => {
    await prisma.raceParticipant.delete({
      where: {
        participantId_raceId: { participantId, raceId }
      }
    });

    return await removeRegistration(clientId, raceId, prisma);
  });
}

// Participant
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

// Booking
async function updateBookingStatus(
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

// Booking
async function findBooking(
  userSessionId: string,
  eventId: string
): Promise<Booking | null> {
  return db.booking.findUnique({
    where: { eventId_userId: { eventId, userId: userSessionId } }
  });
}

// Booking
async function findBookings(userSessionId: string): Promise<Booking[] | null> {
  return db.booking.findMany({
    where: { userId: userSessionId }
  });
}

// Booking
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

// Booking
async function removeBooking(
  userSessionId: string,
  eventId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  await (tx || db).booking.delete({
    where: { eventId_userId: { eventId, userId: userSessionId } }
  });
}

// Misc
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

    await prisma.cart.updateMany({
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
  findUserEventRaceParticipants,
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
  changeCheckoutToAuthUser,
  addRegistrationOnUpdateCart,
  findUserRaceParticipants,
  addParticipantToRace
};
