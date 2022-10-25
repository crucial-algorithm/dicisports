import type { ActionFunction } from 'remix';
import { redirect } from 'remix';

import Id from '~/server/utils/Id.server';
import { createDraftEvent } from '~/server/db/events.server';
import i18n from '~/server/i18n.server';
import type { Language } from '~/types';
import { requireAdminUser, requireUser } from '~/server/auth/session.server';

export const action: ActionFunction = async ({ request }) => {
  // hide while this is still in dev
  await requireAdminUser(request);
  const user = await requireUser(request);

  const eventId = Id();
  const language = (await i18n.getLocale(request)) as Language;

  try {
    await createDraftEvent(user.id, language, eventId);
  } catch (err) {
    console.error(err);
    // TODO: redirect somewhere
  }

  return redirect(`/organizer/event/${eventId}`);
};
