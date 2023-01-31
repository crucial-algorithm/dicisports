import type { ActionFunction } from 'remix';
import { redirect } from 'remix';
import { CheckoutStatus } from '@prisma/client';

import { getClientSession } from '~/server/auth/client.server';
import type { RaceCheckoutInput } from '~/types';
import {
  createRegistration,
  findBooking,
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
  const booking = await findBooking(clientId, eventId);

  const data: RaceCheckoutInput = {
    raceId: raceId,
    userId: clientId as string,
    qtd: 1
  };

  try {
    if (checkout) {
      return redirect(
        `/checkout/${
          booking
            ? booking.status === CheckoutStatus.checkout
              ? 'info'
              : booking.status === CheckoutStatus.pending
              ? 'payment'
              : 'confirmation'
            : 'registrations'
        }/${eventId}`
      );
    } else {
      await createRegistration(data);
    }
  } catch (e) {
    console.log(e);

    return redirect('/');
  }

  return redirect(`/checkout/registrations/${eventId}`);
};
