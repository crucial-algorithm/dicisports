import type { ActionFunction } from 'remix';
import { redirect } from 'remix';
import { CheckoutStatus } from '@prisma/client';

import { getClientSession } from '~/server/auth/client.server';
import {
  addRegistration,
  getCartByUserAndRace
} from '~/server/db/cart.server';
import { getUser } from '~/server/auth/session.server';
import { findBooking } from '~/server/db/booking.server';

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const clientSession = await getClientSession(request);
  const authClient = await getUser(request);

  const clientId =
    authClient !== null ? authClient.id : clientSession.getClientId();
  const raceId = form.get('raceId') as string;
  const eventId = form.get('eventId') as string;

  const checkout = await getCartByUserAndRace(clientId, raceId);
  const booking = await findBooking(clientId, eventId);

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
      await addRegistration(clientId as string, raceId);
    }
  } catch (e) {
    console.log(e);

    return redirect('/');
  }

  return redirect(`/checkout/registrations/${eventId}`);
};
