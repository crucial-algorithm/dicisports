import type { LoaderFunction } from '@remix-run/node';

import { getUser } from '~/server/auth/session.server';
import { findEventWithRacesAndDocuments } from '~/server/db/events.server';
import EventDisplayRoute, { loadDisplayEventData } from '~/routes/($lang).event.$slug';

export const loader: LoaderFunction = async ({ params, request }) => {
  const user = await getUser(request);
  const id = params.id as string;
  const event = await findEventWithRacesAndDocuments(id);

  return loadDisplayEventData(
    user,
    event?.createdById === user?.id ? event : null,
    true
  );
};

export default EventDisplayRoute;
