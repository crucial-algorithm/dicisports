import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

import Id from '~/server/utils/Id.server';
import { createDraftEvent } from '~/server/db/events.server';

export const loader: LoaderFunction = async ({ request }) => {
  const eventId = Id();

  try {
    await createDraftEvent(eventId);
  } catch (err) {
    console.error(err);
    // TODO: redirect somewhere
  }

  return redirect(`/organizer/event/${eventId}`);
};
