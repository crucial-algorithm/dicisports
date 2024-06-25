import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';

import Id from '~/server/utils/Id.server';
import { createDraftEvent } from '~/server/db/events.server';
import i18n from '~/server/i18n.server';
import type { Language } from '~/types';
import { requireUser } from '~/server/auth/session.server';

export const loader: LoaderFunction = async ({ request }) => {
  return create(request);
};

export const action: ActionFunction = async ({ request }) => {
  return create(request);
};


async function create(request: Request) {
  const user = await requireUser(request);

  const eventId = Id();
  const language = (await i18n.getLocale(request)) as Language;

  try {
    await createDraftEvent(user.id, language, eventId);
  } catch (err) {
    console.error(err);
    // TODO: redirect somewhere
  }
  return redirect(`/o/event/${eventId}`);
}
