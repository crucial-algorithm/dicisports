import { db } from '~/utils/db.server'
import Config from '~/utils/config.server'

const sessionExpirationTime = Config().SESSION_EXPIRATION_TIME

function getUserByEmail(email: string) {
  return db.user.findUnique({ where: { email } })
}

async function getUserFromSessionId(sessionId: string) {
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

export { getUserByEmail, getUserFromSessionId }
