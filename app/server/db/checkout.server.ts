import type { Prisma } from '@prisma/client';
import { CheckoutStatus, PrismaClient } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type {
  Cart,
  DBRawCart,
  DBRawRaceCheckout,
  DBRawRaceQtd,
  Participant,
  ParticipantInput,
  Race,
  RaceCheckout,
  RaceCheckoutInput,
  RaceParticipant,
  RaceQtd,
  Registration
} from '~/types';
import {
  dbCartToCart,
  dbEventRaceCheckoutQtdToEventRaceCheckoutQtd,
  dbRaceCheckoutToRaceCheckout
} from '~/server/db/codecs.server';
import { findEventRaces } from '~/server/db/races.server';

const prisma = new PrismaClient();

async function createTicket(
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

async function getUserEventTickets(
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

async function addTicket(
  userSessionId: string,
  raceId: string,
  tx?: Prisma.TransactionClient
): Promise<RaceCheckout> {
  const existingCheckout = await getCheckoutByUserAndRace(
    userSessionId,
    raceId
  );

  if (!existingCheckout) {
    return await createTicket(
      {
        userId: userSessionId,
        raceId: raceId,
        qtd: 1
      },
      tx
    );
  }

  return await (tx || db).raceCheckout.update({
    where: { id: existingCheckout.id },
    data: {
      qtd: existingCheckout.qtd + 1
    }
  });
}

async function removeTicket(
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

async function getDistinctUserEventTickets(
  userSessionId: string,
  eventId: string
): Promise<Array<Partial<RaceCheckout>> | null> {
  const query = `
        SELECT id, race_id, user_id, created_at, updated_at
        FROM race_checkout, generate_series(1, qtd)
        WHERE user_id = '${userSessionId}'
          and race_id IN (SELECT id FROM races WHERE event_id = '${eventId}');
    `;

  const results: Array<DBRawRaceCheckout> = await db.$queryRawUnsafe(query);

  return results.map(dbRaceCheckoutToRaceCheckout);
}

async function addParticipantToRace(
  raceId: string,
  userSessionId: string,
  registrationId: string,
  tx?: Prisma.TransactionClient
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    const participant = await (tx || prisma).participant.create({
      data: {
        id: Id(),
        userId: userSessionId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    await (tx || prisma).raceParticipant.create({
      data: {
        id: Id(),
        participantId: participant.id,
        raceId: raceId,
        registrationId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
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

async function findUserSavedParticipants(
  userSessionId: string
): Promise<Participant[] | null> {
  return await db.participant.findMany({
    where: {
      userId: userSessionId,
      firstName: { not: null }
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

async function changeToSelectedRaceParticipant(
  newUser: string,
  oldUser: string,
  raceId: string
): Promise<void> {
  await db.raceParticipant.update({
    where: {
      participantId_raceId: {
        participantId: oldUser,
        raceId
      }
    },
    data: {
      participantId: newUser
    }
  });
}

async function resetParticipant(
  oldParticipant: string,
  userSessionId: string,
  raceId: string
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    const newParticipant = await prisma.participant.create({
      data: {
        id: Id(),
        userId: userSessionId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    await prisma.raceParticipant.update({
      where: {
        participantId_raceId: { participantId: oldParticipant, raceId }
      },
      data: {
        participantId: newParticipant.id
      }
    });
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

    await removeTicket(userSessionId, raceId, prisma);
  });
}

async function addRaceParticipants(
  races: Array<string>,
  userSessionId: string,
  registrationId: string
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    for (const r of races) {
      await addParticipantToRace(r, userSessionId, registrationId, prisma);
      await addTicket(userSessionId, r, prisma);
    }
  });
}

async function updateRaceParticipantStatus(
  raceParticipants: RaceParticipant[],
  status: CheckoutStatus
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    for (const r of raceParticipants) {
      await prisma.raceParticipant.update({
        where: {
          participantId_raceId: {
            participantId: r.participant.id,
            raceId: r.race.id
          }
        },
        data: {
          status
        }
      });
    }
  });
}

async function findRegistration(
  userSessionId: string,
  eventId: string
): Promise<Registration | null> {
  return db.registration.findUnique({
    where: { eventId_userId: { eventId, userId: userSessionId } }
  });
}

async function createRegistration(
  pin: number,
  eventId: string,
  userSessionId: string
): Promise<Registration> {
  return await db.registration.create({
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

export {
  createTicket,
  getUserEventTickets,
  addTicket,
  removeTicket,
  getUserCheckoutRaces,
  findEventRacesCheckoutQtd,
  getCheckoutByUserAndRace,
  addParticipantToRace,
  getDistinctUserEventTickets,
  findUserRaceParticipants,
  findUserParticipants,
  findUserSavedParticipants,
  updateParticipant,
  changeToSelectedRaceParticipant,
  resetParticipant,
  removeRaceParticipant,
  addRaceParticipants,
  updateRaceParticipantStatus,
  findRegistration,
  createRegistration
};
