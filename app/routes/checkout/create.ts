import type { ActionFunction } from 'remix';
import { redirect } from 'remix';

import { getClientSession } from '~/server/auth/client.server';
import type { RaceCheckoutInput } from '~/types';
import {
  addRegistration,
  createRegistration,
  getCheckoutByUserAndRace
} from '~/server/db/checkout.server';
import { getUser } from '~/server/auth/session.server';

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const clientSession = await getClientSession(request);
  const authClient = await getUser(request);

  const clientId =
    authClient !== null ? authClient.id : clientSession.getClientId();
  const raceId = form.get('raceId') as string;
  const eventId = form.get('eventId') as string;

  const checkout = await getCheckoutByUserAndRace(clientId, raceId);

  const data: RaceCheckoutInput = {
    raceId: raceId,
    userId: clientId as string,
    qtd: 1
  };

  try {
    if (checkout) {
      await addRegistration(clientId, raceId);
    } else {
      await createRegistration(data);
    }
  } catch (e) {
    console.log(e);

    return redirect('/');
  }

  return redirect(`/checkout/registrations/${eventId}`);
};
