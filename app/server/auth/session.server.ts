import { createCookieSessionStorage, redirect } from 'remix'
import type { User, Session } from '@prisma/client'
import { sendMagicLinkEmail } from '../send-email.server'
import { getLoginInfoSession } from './login.server'
import Config from '~/server/config.server'
import { decrypt, encrypt } from '~/server/utils/encryption.server'
import {
  getUserByEmail,
  getUserFromSessionId
} from '~/server/db/db.users.server'
import { db } from '~/server/db.server'

const sessionIdKey = '__session_id__'
const magicLinkSearchParam = 'kodyKey'
const sessionExpirationTime = Config().SESSION_EXPIRATION_TIME
const linkExpirationTime = 1000 * 60 * 30

type MagicLinkPayload = {
  emailAddress: string
  creationDate: string
  validateSessionMagicLink: boolean
}

function getMagicLink({
  emailAddress,
  validateSessionMagicLink,
  domainUrl
}: {
  emailAddress: string
  validateSessionMagicLink: boolean
  domainUrl: string
}) {
  const payload: MagicLinkPayload = {
    emailAddress,
    validateSessionMagicLink,
    creationDate: new Date().toISOString()
  }
  const stringToEncrypt = JSON.stringify(payload)
  const encryptedString = encrypt(stringToEncrypt)
  const url = new URL(domainUrl)
  url.pathname = 'magic'
  url.searchParams.set(magicLinkSearchParam, encryptedString)
  return url.toString()
}

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'KCD_root_session',
    secure: true,
    secrets: [Config().SESSION_SECRET],
    sameSite: 'lax',
    path: '/',
    maxAge: sessionExpirationTime / 1000,
    httpOnly: true
  }
})

async function sendToken({
  emailAddress,
  domainUrl
}: {
  emailAddress: string
  domainUrl: string
}) {
  const magicLink = getMagicLink({
    emailAddress,
    validateSessionMagicLink: true,
    domainUrl
  })

  const user = await getUserByEmail(emailAddress).catch(() => {
    /* ignore... */
    return null
  })

  if (!Config().inDev) {
    await sendMagicLinkEmail({
      emailAddress,
      magicLink,
      user,
      domainUrl
    })
  } else {
    console.log('In dev - click here to login: ', magicLink)
  }

  return magicLink
}

async function getSession(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'))
  const initialValue = await sessionStorage.commitSession(session)
  const getSessionId = () => session.get(sessionIdKey) as string | undefined
  const unsetSessionId = () => session.unset(sessionIdKey)

  const commit = async () => {
    const currentValue = await sessionStorage.commitSession(session)
    return currentValue === initialValue ? null : currentValue
  }
  return {
    session,
    getUser: async () => {
      const token = getSessionId()
      if (!token) return null

      return getUserFromSessionId(token).catch((error: unknown) => {
        unsetSessionId()
        console.error(`Failure getting user from session ID:`, error)
        return null
      })
    },
    getSessionId,
    unsetSessionId,
    signIn: async (user: Pick<User, 'id'>) => {
      const userSession = await createSession({ userId: user.id })
      session.set(sessionIdKey, userSession.id)
    },
    signOut: () => {
      const sessionId = getSessionId()
      if (sessionId) {
        unsetSessionId()
        db.session
          .delete({ where: { id: sessionId } })
          .catch((error: unknown) => {
            console.error(`Failure deleting user session: `, error)
          })
      }
    },
    commit,
    /**
     * This will initialize a Headers object if one is not provided.
     * It will set the 'Set-Cookie' header value on that headers object.
     * It will then return that Headers object.
     */
    getHeaders: async (headers: ResponseInit['headers'] = new Headers()) => {
      const value = await commit()
      if (!value) return headers
      if (headers instanceof Headers) {
        headers.append('Set-Cookie', value)
      } else if (Array.isArray(headers)) {
        headers.push(['Set-Cookie', value])
      } else {
        headers['Set-Cookie'] = value
      }
      return headers
    }
  }
}

async function createSession(
  sessionData: Omit<Session, 'id' | 'expirationDate' | 'createdAt'>
) {
  return db.session.create({
    data: {
      ...sessionData,
      expirationDate: new Date(Date.now() + sessionExpirationTime)
    }
  })
}

async function deleteOtherSessions(request: Request) {
  const { session } = await getSession(request)

  const token = session.get(sessionIdKey) as string | undefined
  if (!token) {
    console.warn(
      `Trying to delete other sessions, but the request came from someone who has no sessions`
    )
    return
  }
  const user = await getUserFromSessionId(token)
  await db.session.deleteMany({
    where: { userId: user.id, NOT: { id: token } }
  })
}

async function getUser(request: Request) {
  const { session } = await getSession(request)

  const token = session.get(sessionIdKey) as string | undefined
  if (!token) return null

  return getUserFromSessionId(token).catch((error: unknown) => {
    console.error(`Failure getting user from session ID:`, error)
    return null
  })
}

async function getUserSessionFromMagicLink(request: Request) {
  const loginInfoSession = await getLoginInfoSession(request)
  const email = await validateMagicLink(
    request.url,
    loginInfoSession.getMagicLink()
  )

  const user = await getUserByEmail(email)
  if (!user) return null

  const session = await getSession(request)
  await session.signIn(user)
  return session
}

async function requireAdminUser(request: Request): Promise<User> {
  const user = await getUser(request)
  if (!user) {
    const session = await getSession(request)
    session.signOut()
    throw redirect('/login', { headers: await session.getHeaders() })
  }
  if (user.role !== 'ADMIN') {
    throw redirect('/')
  }
  return user
}

async function requireUser(request: Request): Promise<User> {
  const user = await getUser(request)
  if (!user) {
    const session = await getSession(request)
    session.signOut()
    throw redirect('/login', { headers: await session.getHeaders() })
  }
  return user
}

function getMagicLinkCode(link: string) {
  try {
    const url = new URL(link)
    return url.searchParams.get(magicLinkSearchParam) ?? ''
  } catch {
    return ''
  }
}

async function validateMagicLink(
  link: string | undefined,
  sessionMagicLink?: string
) {
  if (!link) throw new Error(`>>Error<<: Magic link is undefined`)
  const linkCode = getMagicLinkCode(link)
  const sessionLinkCode = sessionMagicLink
    ? getMagicLinkCode(sessionMagicLink)
    : null
  let emailAddress, linkCreationDateString, validateSessionMagicLink
  const invalidLinkError = new Error(
    '>>Error<<: Sign in link invalid. Please request a new one'
  )
  try {
    const decryptedString = decrypt(linkCode)
    const payload = JSON.parse(decryptedString) as MagicLinkPayload
    emailAddress = payload.emailAddress
    linkCreationDateString = payload.creationDate
    validateSessionMagicLink = payload.validateSessionMagicLink
  } catch (error: unknown) {
    console.error(error)
    throw invalidLinkError
  }

  if (typeof emailAddress !== 'string') {
    console.error(`Email is not a string. Maybe wasn't set in the session?`)
    throw invalidLinkError
  }

  if (validateSessionMagicLink) {
    if (!sessionLinkCode) {
      console.error(
        'Must validate session magic link but no session link provided'
      )
      throw invalidLinkError
    }
    if (linkCode !== sessionLinkCode) {
      console.error(`Magic link does not match sessionMagicLink`)
      throw new Error(
        `>>Error<<: You must open the magic link on the same device it was created`
      )
    }
  }

  if (typeof linkCreationDateString !== 'string') {
    console.error('Link expiration is not a string.')
    throw invalidLinkError
  }

  const linkCreationDate = new Date(linkCreationDateString)
  const expirationTime = linkCreationDate.getTime() + linkExpirationTime
  if (Date.now() > expirationTime) {
    throw new Error('>>Error<<: Magic link expired')
  }
  return emailAddress
}

export {
  getSession,
  deleteOtherSessions,
  getUserSessionFromMagicLink,
  requireUser,
  requireAdminUser,
  getUser,
  sendToken,
  validateMagicLink
}
