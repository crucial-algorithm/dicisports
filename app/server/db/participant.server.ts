import type { Prisma } from '@prisma/client';
import { CheckoutStatus, PrismaClient, Status } from '@prisma/client';

import type {
  Participant,
  ParticipantInput,
  RaceParticipant,
  RaceParticipantInput,
  UIRaceParticipant
} from '~/types';
import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import { findBooking } from '~/server/db/booking.server';
import { createTeam, findEventTeamByName } from '~/server/db/teams.server';

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
  eventId: string,
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
          eventId,
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
  eventId: string,
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
        eventId,
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
  bookingId: string
): Promise<RaceParticipant[] | null> {
  const booking = await findBooking(bookingId);

  if (!booking) {
    return null;
  }

  return await db.raceParticipant.findMany({
    where: {
      bookingId: booking.id
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
      birthdate: participant.birthdate,
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
  raceId: string
): Promise<void> {
  await prisma.raceParticipant.delete({
    where: {
      participantId_raceId: { participantId, raceId }
    }
  });
}

async function addRaceParticipants(
  raceIds: string[],
  userSessionId: string,
  registrationId: string,
  eventId: string
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    await addParticipantsToRace(raceIds, userSessionId, registrationId, eventId, prisma);
  });
}

// TODO: Shouldn't always be using LIKE when there is no need
async function findRaceParticipants(
  eventId: string,
  page: number,
  pageSize = 10,
  searchedName: string | null
): Promise<{ results: UIRaceParticipant[]; total: number }> {
  const where: Prisma.RaceParticipantWhereInput = {
    participant: {
      OR: [
        {
          firstName: {
            contains: searchedName?.length ? searchedName : '',
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: searchedName?.length ? searchedName : '',
            mode: 'insensitive'
          }
        }
      ],
      status: 'saved'
    },
    race: { eventId }
  };

  const results = await db.raceParticipant.findMany({
    select: {
      id: true,
      bibNumber: true,
      participant: {
        select: {
          firstName: true,
          lastName: true,
          birthdate: true,
          gender: true
        }
      },
      booking: {
        select: {
          status: true,
          createdAt: true
        }
      },
      race: {
        select: {
          name: true
        }
      },
      team: {
        select: {
          name: true
        }
      }
    },
    where,
    take: pageSize,
    skip: page * pageSize
  });

  const total = await db.raceParticipant.aggregate({
    _count: {
      _all: true
    },
    where
  });

  return {
    results: results.map((r) => {
      return {
        id: r.id,
        name: `${r.participant.firstName} ${r.participant.lastName}`,
        birthdate: r.participant.birthdate as Date,
        gender: r.participant.gender as string,
        bookingAt: r.booking.createdAt,
        status: r.booking.status,
        raceName: r.race.name,
        teamName: r.team ? r.team.name : null,
        bibNumber: r.bibNumber
      };
    }),
    total: total._count._all
  };
}

/**
 *
 * Returns array with all user's saved participants once he has at least
 * one paid booking.
 *
 */
async function findUserSavedParticipants(
  userId: string
): Promise<Participant[] | null> {
  // This will check if user has any paid booking and return a boolean
  const isThereAnyUserConfirmedBooking = await db.booking
    .findFirst({
      where: {
        userId,
        status: 'confirmed'
      }
    })
    .then((r) => Boolean(r));

  // Saved participants are only suggested once user has a paid booking
  if (!isThereAnyUserConfirmedBooking) {
    return null;
  }

  return await db.participant.findMany({
    where: {
      userId,
      status: 'saved'
    },
    orderBy: {
      firstName: 'asc'
    }
  });
}

async function findUserBookingParticipants(
  bookingId: string
): Promise<RaceParticipant[] | null> {
  return db.raceParticipant.findMany({
    where: { bookingId },
    include: {
      race: true,
      participant: true,
      team: true
    }
  });
}

async function findEventRaceParticipants(
  eventId: string
): Promise<RaceParticipant[] | null> {
  return db.raceParticipant.findMany({
    where: {
      race: {
        eventId
      },
      participant: {
        status: {
          not: Status.auto
        }
      },
      booking: {
        status: {
          not: CheckoutStatus.checkout
        }
      }
    },
    include: {
      race: true,
      participant: true,
      booking: true,
      team: true
    }
  });
}

async function findRaceParticipant(
  participantId: string,
  raceId: string
): Promise<RaceParticipant | null> {
  return await db.raceParticipant.findUnique({
    where: {
      participantId_raceId: { participantId, raceId }
    },
    include: {
      race: true,
      participant: true,
      booking: true,
      team: true
    }
  });
}

async function updateRaceParticipantTeam(
  teamName: string | null,
  eventId: string,
  raceParticipant: RaceParticipant
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    let teamId: string | null = teamName;

    if (teamName !== null) {
      const existingTeam = await findEventTeamByName(teamName, eventId, prisma);

      if (!existingTeam) {
        const newTeam = await createTeam(teamName, eventId, prisma);

        teamId = newTeam.id;
      } else {
        teamId = existingTeam.id;
      }
    }

    await prisma.raceParticipant.update({
      where: { id: raceParticipant.id },
      data: {
        teamId
      }
    });
  });
}

async function assignParticipantsBibNumber(
  raceParticipants: RaceParticipant[],
  eventId: string
): Promise<void> {
  return await db.$transaction(async (tx) => {
    const result: { bib_number: number }[] = await tx.$queryRaw`SELECT bib_number
                                                            FROM latest_bib_number
                                                            WHERE event_id = ${eventId} FOR UPDATE;`;
    let bibNumber = result[0].bib_number;

    await Promise.all(
      raceParticipants.map(async (rp) => {
        bibNumber += 1;

        await tx.raceParticipant.update({
          where: {
            id: rp.id
          },
          data: {
            bibNumber
          }
        });
      })
    );

    await tx.latestBibNumber.update({
      where: {
        eventId
      },
      data: {
        bibNumber
      }
    });
  });
}

async function updateRaceParticipantsPrice(
  bookingId: string,
  tx?: Prisma.TransactionClient
) {
  return await (tx || db).$queryRaw`
      UPDATE race_participants rp
      SET price = CASE
                      WHEN r.price_early_bird IS NOT NULL AND r.valid_until > current_date THEN r.price_early_bird
                      ELSE r.price END FROM races r
      WHERE r.id = rp.race_id
        AND booking_id = ${bookingId};
  `;
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
  findUserSavedParticipants,
  findUserBookingParticipants,
  findEventRaceParticipants,
  findRaceParticipant,
  updateRaceParticipantTeam,
  assignParticipantsBibNumber,
  updateRaceParticipantsPrice
};
