import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

import { getClientSession } from '~/server/auth/client.server';
import { findUserRaceParticipants } from '~/server/db/checkout.server';

export const loader: LoaderFunction = async ({ request, params }) => {
  const eventId = params.eventId as string;
  const clientSession = await getClientSession(request);

  const clientId = clientSession.getClientId();
  const raceParticipants = await findUserRaceParticipants(clientId, eventId);

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/checkout/tickets/${eventId}`);
  }

  if (raceParticipants[0].status !== 'confirmed') {
    return redirect(
      `/checkout/${
        raceParticipants[0].status === 'pending' ? 'payment' : 'checkout'
      }/${eventId}`
    );
  }


};
