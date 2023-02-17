import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

import type {
  Cart,
  DBRawParticipant,
  DBRawUIRaceParticipant,
  Participant,
  ParticipantInput,
  RaceParticipant,
  RaceParticipantInput,
  UIRaceParticipant
} from '~/types';
import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import { findEventRaces } from '~/server/db/races.server';
import { addRegistration, removeRegistration } from '~/server/db/cart.server';
import {
  dbParticipantToParticipant,
  dbUIRaceParticipantToUIRaceParticipant
} from '~/server/db/codecs.server';

const prisma = new PrismaClient();

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

async function findUserParticipants(
  userSessionId: string
): Promise<Participant[]> {
  return await db.participant.findMany({
    where: {
      userId: userSessionId
    }
  });
}

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

// TODO: Shouldn't always be using LIKE when there is no need
async function findRaceParticipants(
  eventId: string,
  page: number,
  pageSize = 10,
  searchedName: string | null
): Promise<{ results: UIRaceParticipant[]; total: number }> {
  const name = `%${searchedName?.length ? searchedName : ''}%`;

  const results: Array<DBRawUIRaceParticipant> = await db.$queryRaw`
        SELECT *, count(1) over () as records
        FROM (SELECT rp.id,
                     concat(p.first_name, ' ', p.last_name) as name,
                     p.birthday,
                     p.gender,
                     b.created_at                           as booking_at,
                     b.status,
                     r.name                                 as race_name
              FROM race_participants rp
                       INNER JOIN participants p on p.id = rp.participant_id
                       INNER JOIN bookings b on rp.booking_id = b.id
                       INNER JOIN races r on r.id = rp.race_id
              WHERE p.status = 'saved'
                AND first_name || ' ' || last_name ILIKE ${name}
                AND r.event_id = ${eventId}) as P LIMIT ${pageSize}
        OFFSET ${page * pageSize};
    `;
  const mapped = results.map(dbUIRaceParticipantToUIRaceParticipant);
  const total = results.length === 0 ? 0 : Number(results[0].records);

  return { results: mapped, total };
}

async function findUserSavedParticipants(
  userId: string
): Promise<Participant[] | null> {
  const results: Array<DBRawParticipant> = await db.$queryRaw`
        SELECT *
        FROM participants p
        WHERE EXISTS(SELECT 1 FROM bookings b WHERE p.user_id = b.user_id AND b.status = 'confirmed')
          AND user_id = ${userId}
          AND status = 'saved';
    `;

  return results.map(dbParticipantToParticipant);
}

export {
  addParticipantsToRace,
  findUserEventRaceParticipants,
  findUserParticipants,
  updateParticipant,
  updateToSelectedParticipant,
  removeRaceParticipant,
  addRaceParticipants,
  findUserRaceParticipants,
  addParticipantToRace,
  findRaceParticipants,
  findUserSavedParticipants
};
