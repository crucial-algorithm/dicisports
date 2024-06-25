import { Role } from '@prisma/client';
import { createCookieSessionStorage, redirect } from '@remix-run/node';

import Config from '~/server/config.server';
import { decrypt, encrypt } from '~/server/utils/encryption.server';
import {
  findUserByEmail,
  findUserFromSessionId
} from '~/server/db/users.server';
import {
  createSession,
  deleteSession,
  setSessionImpersonated,
  setSessionUnImpersonated
} from '~/server/db/sessions.server';
import type { LoginAction, User } from '~/types';

import { sendRecoverPasswordEmail } from '../email.server';

import { getLoginInfoSession } from './login.server';

const sessionIdKey = '__session_id__';
const magicLinkSearchParam = 'key';
const sessionExpirationTime = Config().SESSION_EXPIRATION_TIME;
const linkExpirationTime = 1000 * 60 * 30;

type MagicLinkPayload = {
  emailAddress: string;
  creationDate: string;
  validateSessionMagicLink: boolean;
  action?: LoginAction;
  group?: string | null;
};

function getRecoverPasswordLink({
  emailAddress,
  domainUrl
}: {
  emailAddress: string;
  domainUrl: string;
}) {
  const payload = {
    emailAddress,
    creationDate: new Date().toISOString()
  };

  const stringToEncrypt = JSON.stringify(payload);
  const encryptedString = encrypt(stringToEncrypt);
  const url = new URL(domainUrl);

  url.pathname = 'magic';
  url.searchParams.set(magicLinkSearchParam, encryptedString);
  return url.toString();
}

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'ds_root_session',
    secure: true,
    secrets: [Config().SESSION_SECRET],
    sameSite: 'lax',
    path: '/',
    maxAge: sessionExpirationTime / 1000,
    httpOnly: true
  }
});

async function sendRecoverPasswordToken({
  emailAddress,
  domainUrl
}: {
  emailAddress: string;
  domainUrl: string;
}) {
  const magicLink = getRecoverPasswordLink({
    emailAddress,
    domainUrl
  });

  const user = await findUserByEmail(emailAddress).catch(() => {
    /* ignore... */
    return null;
  });

  if (!user) {
    return null;
  }

  await sendRecoverPasswordEmail({
    emailAddress,
    magicLink,
    user
  });

  return magicLink;
}

async function getSession(request: Request) {
  const session = await sessionStorage.getSession(
    request.headers.get('Cookie')
  ); 
  const initialValue = await sessionStorage.commitSession(session);
  const getSessionId = () => session.get(sessionIdKey) as string | undefined;
  const unsetSessionId = () => session.unset(sessionIdKey);

  const commit = async () => {
    const currentValue = await sessionStorage.commitSession(session);

    return currentValue === initialValue ? null : currentValue;
  };

  return {
    session,
    getUser: async (): Promise<{ user: User | null; impersonatedUser: User | null }> => {
      const token = getSessionId();

      if (!token) {
        return { user: null, impersonatedUser: null };
      }

      return await findUserFromSessionId(token).catch(
        (error: unknown) => {
          unsetSessionId();
          console.error('Failure getting user from session ID:', error);
          return { user: null, impersonatedUser: null };
        }
      );
    },
    getSessionId,
    unsetSessionId,
    signIn: async (user: Pick<User, 'id'>) => {
      const userSession = await createSession({ userId: user.id });

      session.set(sessionIdKey, userSession.id);
    },
    signOut: () => {
      const sessionId = getSessionId();

      if (!sessionId) {
        return;
      }

      unsetSessionId();
      deleteSession(sessionId);
    },
    commit,
    /**
     * This will initialize a Headers object if one is not provided.
     * It will set the 'Set-Cookie' header value on that headers object.
     * It will then return that Headers object.
     */
    // eslint-disable-next-line no-undef
    getHeaders: async (headers: ResponseInit['headers'] = new Headers()) => {
      const value = await commit();

      if (!value) {
        return headers;
      }
      if (headers instanceof Headers) {
        headers.append('Set-Cookie', value);
      } else if (Array.isArray(headers)) {
        headers.push(['Set-Cookie', value]);
      } else {
        headers['Set-Cookie'] = value;
      }
      return headers;
    }
  };
}

async function getUser(request: Request): Promise<User | null> {
  const { session } = await getSession(request);

  const token = session.get(sessionIdKey) as string | undefined;

  if (!token) {
    return null;
  }

  const { user, impersonatedUser } = await findUserFromSessionId(token).catch(
    (error: unknown) => {
      console.error('Failure getting user from session ID:', error);
      return { user: null, impersonatedUser: null };
    }
  );

  return impersonatedUser || user;
}

async function impersonateSession(request: Request, userId: string) {
  const { session } = await getSession(request);

  const token = session.get(sessionIdKey) as string | undefined;

  if (!token) {
    return;
  }

  return setSessionImpersonated(token, userId);
}

async function unImpersonateSession(request: Request) {
  const { session } = await getSession(request);

  const token = session.get(sessionIdKey) as string | undefined;

  if (!token) {
    return;
  }

  return setSessionUnImpersonated(token);
}

async function getUserSessionFromMagicLink(request: Request) {
  const loginInfoSession = await getLoginInfoSession(request);
  const { email } = await validateMagicLink(
    request.url,
    loginInfoSession.getMagicLink()
  );

  const user = await findUserByEmail(email);

  if (!user) {
    return { session: null, user: null };
  }

  const session = await getSession(request);

  await session.signIn(user);
  return { session, user };
}

async function requireAdminUser(request: Request): Promise<User> {
  const user = await getUser(request);

  if (!user) {
    const session = await getSession(request);

    session.signOut();
    throw redirect('/login', { headers: await session.getHeaders() });
  }
  if (user.role !== Role.ADMIN) {
    throw redirect('/');
  }
  return user;
}

async function requireOrganizer(request: Request): Promise<User> {
  const user = await getUser(request);

  if (!user) {
    const session = await getSession(request);

    session.signOut();
    throw redirect('/login', { headers: await session.getHeaders() });
  }
  if (user.role !== Role.ORGANIZER) {
    throw redirect('/');
  }
  return user;
}

async function requireUser(
  request: Request,
  redirectTo: string = '/login'
): Promise<User> {
  const user = await getUser(request);

  if (!user) {
    const session = await getSession(request);

    session.signOut();
    throw redirect(redirectTo, { headers: await session.getHeaders() });
  }
  return user;
}

function getMagicLinkCode(link: string) {
  try {
    const url = new URL(link);

    return url.searchParams.get(magicLinkSearchParam) || '';
  } catch {
    return '';
  }
}

async function validateMagicLink(
  link: string | undefined,
  sessionMagicLink?: string
) {
  if (!link) {
    throw new Error('>>Error<<: Magic link is undefined');
  }
  const linkCode = getMagicLinkCode(link);
  const sessionLinkCode = sessionMagicLink
    ? getMagicLinkCode(sessionMagicLink)
    : null;
  let emailAddress,
    linkCreationDateString,
    validateSessionMagicLink,
    action,
    group;
  const invalidLinkError = new Error(
    '>>Error<<: Sign in link invalid. Please request a new one'
  );

  try {
    const decryptedString = decrypt(linkCode);
    const payload = JSON.parse(decryptedString) as MagicLinkPayload;

    emailAddress = payload.emailAddress;
    linkCreationDateString = payload.creationDate;
    validateSessionMagicLink = payload.validateSessionMagicLink;
    action = payload.action;
    group = payload.group;
  } catch (error: unknown) {
    console.error(error);
    throw invalidLinkError;
  }

  if (typeof emailAddress !== 'string') {
    console.error("Email is not a string. Maybe wasn't set in the session?");
    throw invalidLinkError;
  }

  if (validateSessionMagicLink) {
    // check https://github.com/crucial-algorithm/dici-pilot/issues/12
    if (!sessionLinkCode) {
      console.error(
        'Must validate session magic link but no session link provided'
      );
      throw invalidLinkError;
    }
    if (linkCode !== sessionLinkCode) {
      console.error('Magic link does not match sessionMagicLink');
      throw new Error(
        '>>Error<<: You must open the magic link on the same device it was created'
      );
    }
  }

  if (typeof linkCreationDateString !== 'string') {
    console.error('Link expiration is not a string.');
    throw invalidLinkError;
  }

  const linkCreationDate = new Date(linkCreationDateString);
  const expirationTime = linkCreationDate.getTime() + linkExpirationTime;

  if (Date.now() > expirationTime) {
    throw new Error('>>Error<<: Magic link expired');
  }
  return { email: emailAddress, action, group };
}

export {
  getSession,
  getUserSessionFromMagicLink,
  requireUser,
  requireAdminUser,
  requireOrganizer,
  getUser,
  sendRecoverPasswordToken,
  unImpersonateSession,
  impersonateSession
};
