import type { ActionFunction } from '@remix-run/node';

import { json, redirect } from '@remix-run/node';

import { getLocationSession } from '~/server/location.server';


export const action: ActionFunction = async ({ request }) => {
  const session = await getLocationSession(request);
  const form = await request.formData();
  const latitude = form.get('latitude');
  const longitude = form.get('longitude');

  if (Number.isNaN(Number(latitude)) || Number.isNaN(Number(longitude)) ) {
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
