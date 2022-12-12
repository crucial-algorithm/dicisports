import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';
import type { RaceCheckout, RaceCheckoutInput } from '~/types';

async function createTicket(
  raceCheckout: RaceCheckoutInput
): Promise<RaceCheckout> {
  const checkoutId = raceCheckout.id || Id();
  const checkoutAt = new Date();

  return await db.raceCheckout.create({
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

async function getUserTickets(
  userSessionId: string
): Promise<RaceCheckout[] | null> {
  return await db.raceCheckout.findMany({
    where: { userId: userSessionId }
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
  raceId: string
): Promise<RaceCheckout> {
  const existingCheckout = await getCheckoutByUserAndRace(
    userSessionId,
    raceId
  );

  if (!existingCheckout) {
    return await createTicket({
      userId: userSessionId,
      raceId: raceId,
      qtd: 1
    });
  }

  return await db.raceCheckout.update({
    where: { id: existingCheckout.id },
    data: {
      qtd: existingCheckout.qtd + 1
    }
  });
}

async function removeTicket(
  userSessionId: string,
  raceId: string
): Promise<RaceCheckout | null> {
  const existingCheckout = await getCheckoutByUserAndRace(
    userSessionId,
    raceId
  );

  if (!existingCheckout || existingCheckout.qtd === 0) {
    return null;
  }

  if (existingCheckout.qtd === 1 || existingCheckout.qtd === 0) {
    return await db.raceCheckout.delete({
      where: { userId_raceId: { userId: userSessionId, raceId } }
    });
  }

  return await db.raceCheckout.update({
    where: { userId_raceId: { userId: userSessionId, raceId } },
    data: {
      qtd: existingCheckout.qtd - 1
    }
  });
}

export { createTicket, getUserTickets, addTicket, removeTicket };
