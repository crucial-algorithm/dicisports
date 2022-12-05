import type { LoaderFunction } from 'remix';

import { getUser } from '~/server/auth/session.server';
import { findEvent } from '~/server/db/events.server';
import EventDisplayRoute, { loadDisplayEventData } from '~/routes/event/$slug';

export const loader: LoaderFunction = async ({ params, request }) => {
  const user = await getUser(request);
  const id = params.id as string;
  const event = await findEvent(id);

  return loadDisplayEventData(user, event?.createdById === user?.id? event : null);
};

export default EventDisplayRoute;
