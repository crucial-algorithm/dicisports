import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type {
  Cart,
  CartInput,
  DBRawCart,
  DBRawRaceQtd,
  DBRawUICartRow,
  PartialRaceCheckout,
  Race,
  RaceQtd,
  ShirtSize,
  UICartRow
} from '~/types';
import {
  dbCartToCart,
  dbEventRaceCheckoutQtdToEventRaceCheckoutQtd,
  dbShirtSizeToShirtSize,
  dbUICartToUICart
} from '~/server/db/codecs.server';
import { findEventRaces } from '~/server/db/races.server';
import { addParticipantToRace } from '~/server/db/participant.server';

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
               r.name   as race_name,
               r.price  as race_price,
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

// Misc
async function findShirtSizes(): Promise<Array<ShirtSize>> {
  const shirtSizes = await db.shirtSize.findMany({
    orderBy: {
      id: 'asc'
    }
  });

  return shirtSizes.map(dbShirtSizeToShirtSize);
}

async function changeRegistrationToAuthUser(
  authUser: string,
  oldUser: string
): Promise<void> {
  return prisma.$transaction(async (prisma) => {
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
  getDistinctUserEventCheckoutRaces,
  findShirtSizes,
  changeRegistrationToAuthUser,
  addRegistrationOnUpdateCart
};
