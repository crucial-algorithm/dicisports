import crypto from 'crypto';

import type { User } from '@prisma/client';

import { db } from '~/server/db.server';
import Config from '~/server/config.server';
import Id from '~/server/utils/Id.server';

const sessionExpirationTime = Config().SESSION_EXPIRATION_TIME;

function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } });
}

async function findUserFromSessionId(sessionId: string) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true }
  });

  if (!session) {
    throw new Error('>>Error<<: No user found');
  }

  if (Date.now() > session.expirationDate.getTime()) {
    await db.session.delete({ where: { id: sessionId } });
    throw new Error('>>Error<<: Session expired');
  }

  // if there's less than ~six months left, extend the session
  const twoWeeks = 1000 * 60 * 60 * 24 * 30 * 6;

  if (Date.now() + twoWeeks > session.expirationDate.getTime()) {
    const newExpirationDate = new Date(Date.now() + sessionExpirationTime);

    await db.session.update({
      data: { expirationDate: newExpirationDate },
      where: { id: sessionId }
    });
  }

  return session.user;
}

async function createUser({
  email,
  name,
  password
}: {
  email: string;
  name: string;
  password: string;
}): Promise<User> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');

  return await db.user.create({
    data: { id: Id(), email, name, password: hash, salt }
  });
}

async function loginUser({
  email,
  password
}: {
  email: string;
  password: string;
}): Promise<User | null> {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }
  const hash = crypto
    .pbkdf2Sync(password, user.salt || '', 1000, 64, 'sha512')
    .toString('hex');

  return user.password === hash ? user : null;
}

async function updateUserPassword({
  id,
  password
}: {
  id: string;
  password: string;
}): Promise<User | null> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
    .toString('hex');

  return await db.user.update({
    where: { id },
    data: { password: hash, salt }
  });
}

async function updateUser(id: string, name: string): Promise<User> {
  return await db.user.update({
    where: { id },
    data: { name }
  });
}

export {
  findUserByEmail,
  findUserFromSessionId,
  createUser,
  updateUser,
  loginUser,
  updateUserPassword
};
