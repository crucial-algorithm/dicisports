import { createCookieSessionStorage } from '@remix-run/node';

import Config from '~/server/config.server';

const { SESSION_SECRET } = Config();

const locationStorage = createCookieSessionStorage({
  cookie: {
    name: 'ds_my_location',
    secure: true,
    secrets: [SESSION_SECRET],
    sameSite: 'lax',
    path: '/',
    // no location for you on my 100th birthday! 😂
    expires: new Date('2082-09-13'),
    httpOnly: true
  }
});

async function getLocationSession(request: Request) {
  const session = await locationStorage.getSession(request.headers.get('Cookie'));

  return {
    getLocation: () => {
      const value = session.get('location');

      return value ? value.split(',').map(Number) : null;
    },
    setLocation: (location: string) => session.set('location', location),
    commit: () => locationStorage.commitSession(session)
  };
}

export { getLocationSession };