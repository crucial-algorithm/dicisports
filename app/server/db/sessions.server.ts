import type { Session } from '@prisma/client';

import { db } from '~/server/db.server';
import Config from '~/server/config.server';

async function createSession(
  sessionData: Omit<Session, 'id' | 'expirationDate' | 'createdAt' | 'impersonatedUserId'>
) {
  return db.session.create({
    data: {
      ...sessionData,
      expirationDate: new Date(Date.now() + Config().SESSION_EXPIRATION_TIME)
    }
  });
}

async function deleteSession(id: string): Promise<Session | void> {
  return db.session.delete({ where: { id } }).catch((error: unknown) => {
    console.error('Failure deleting user session: ', error);
  });
}


async function setSessionImpersonated(
  sessionId: string,
  userId: string
): Promise<Session | void> {
  return db.session
    .update({
      data: { impersonatedUserId: userId },
      where: { id: sessionId }
    })
    .catch((error: unknown) => {
      console.error('could not impersonate', error);
    });
}


async function setSessionUnImpersonated(
  sessionId: string
): Promise<Session | void> {
  return db.session
    .update({
      data: { impersonatedUserId: null },
      where: { id: sessionId }
    })
    .catch((error: unknown) => {
      console.error('could not un impersonate', error);
    });
}

/**
 *
 * @param userId
 * @param token   Keep session with this token
 */
async function deleteOtherUserSessions(userId: string, token: string) {
  return db.session.deleteMany({
    where: { userId: userId, NOT: { id: token } }
  });
}

export {
  deleteSession,
  createSession,
  deleteOtherUserSessions,
  setSessionImpersonated,
  setSessionUnImpersonated
};
