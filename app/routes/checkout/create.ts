import type { ActionFunction } from 'remix';
import { redirect } from 'remix';

import { getClientSession } from '~/server/auth/client.server';
import type { RaceCheckoutInput } from '~/types';
import {
  addTicket,
  createTicket,
  getCheckoutByUserAndRace
} from '~/server/db/checkout.server';

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const clientSession = await getClientSession(request);

  const clientId = clientSession.getClientId();
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
      await addTicket(clientId, raceId);
    } else {
      await createTicket(data);
    }
  } catch (e) {
    console.log(e);

    return redirect('/');
  }

  return redirect(`/checkout/tickets/${eventId}`);
};
