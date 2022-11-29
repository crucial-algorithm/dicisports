import type { LoaderFunction } from 'remix';

import { getUser } from '~/server/auth/session.server';
import { findEvent } from '~/server/db/events.server';
import EventDisplayRoute, { loadDisplayEventData } from '~/routes/event/$slug';

export const loader: LoaderFunction = async ({ params, request }) => {
  const user = await getUser(request);
  const id = params.id as string;
  const event = await findEvent(id);

  if (user?.id !== event?.createdById) {
    // Send preview as false so it triggers the handled error
    return loadDisplayEventData(user, event, false);
  }

  // Otherwise send it as true
  return loadDisplayEventData(user, event, true);
};

export default EventDisplayRoute;
