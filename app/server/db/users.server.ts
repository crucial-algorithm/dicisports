import { db } from '~/server/db.server'
import Config from '~/server/config.server'
import Id from '~/server/utils/Id.server'
import { User } from '@prisma/client'

const sessionExpirationTime = Config().SESSION_EXPIRATION_TIME

function findUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } })
}

async function findUserFromSessionId(sessionId: string) {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true }
  })
  if (!session) {
    throw new Error('>>Error<<: No user found')
  }

  if (Date.now() > session.expirationDate.getTime()) {
    await db.session.delete({ where: { id: sessionId } })
    throw new Error('>>Error<<: Session expired')
  }

  // if there's less than ~six months left, extend the session
  const twoWeeks = 1000 * 60 * 60 * 24 * 30 * 6
  if (Date.now() + twoWeeks > session.expirationDate.getTime()) {
    const newExpirationDate = new Date(Date.now() + sessionExpirationTime)
    await db.session.update({
      data: { expirationDate: newExpirationDate },
      where: { id: sessionId }
    })
  }

  return session.user
}

async function createUser({
  email,
  name
}: {
  email: string
  name: string
}): Promise<User> {
  return await db.user.create({
    data: { id: Id(), email, name }
  })
}

async function updateUser(id: string, name: string): Promise<User> {
  return await db.user.update({
    where: { id },
    data: { name }
  })
}

export { findUserByEmail, findUserFromSessionId, createUser, updateUser }
