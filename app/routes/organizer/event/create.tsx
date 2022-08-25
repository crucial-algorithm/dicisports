import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

import Id from '~/server/utils/Id.server';
import { createDraftEvent } from '~/server/db/events.server';
import i18n from '~/server/i18n.server';
import type { Language } from '~/types';

export const loader: LoaderFunction = async ({ request, params }) => {
  const eventId = Id();
  const language = await i18n.getLocale(request) as Language;

  try {
    await createDraftEvent(language, eventId);
  } catch (err) {
    console.error(err);
    // TODO: redirect somewhere
  }

  return redirect(`/organizer/event/${eventId}`);
};
