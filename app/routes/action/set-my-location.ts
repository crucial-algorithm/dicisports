import type { ActionFunction } from 'remix';
import { createCookieSessionStorage, json, redirect } from 'remix';

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

export async function getLocationSession(request: Request) {
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

export const action: ActionFunction = async ({ request }) => {
  const session = await getLocationSession(request);
  const form = await request.formData();
  const latitude = form.get('latitude');
  const longitude = form.get('longitude');

  if (isNaN(Number(latitude)) || isNaN(Number(longitude)) ) {
    return json({
      success: false,
      message: `coordinates are invalid (${latitude},${longitude})`
    });
  }

  session.setLocation(`${latitude},${longitude}`);
  return json(
    { success: true },
    {
      headers: { 'Set-Cookie': await session.commit() }
    }
  );
};

export const loader = () => redirect('/', { status: 404 });
