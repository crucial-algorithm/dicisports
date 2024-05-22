import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { redirect } from 'react-router';

import { requireUser } from '~/server/auth/session.server';
import {
  addEventToFavorites,
  findEvent,
  removeEventFromFavorites
} from '~/server/db/events.server';

export const loader: LoaderFunction = async ({ request }) => {
  return redirect('/');
};

export const action: ActionFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const event = params.eventId ? await findEvent(params.eventId) : null;

  if (!event) {
    return json({ ok: false });
  }

  const form = await request.formData();
  const action = form.get('action') as string | 'add';

  try {
    if (action === 'add') {
      await addEventToFavorites(user.id, event.id);
    }

    if (action === 'remove') {
      await removeEventFromFavorites(user.id, event.id);
    }

    return json({ ok: true, action });
  } catch (e) {
    // @ts-ignore
    return json({ error: e.message, action });
  }
};
