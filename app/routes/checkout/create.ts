import type { ActionFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { CheckoutStatus } from '@prisma/client';
import type { TFunction } from 'i18next';

import { getClientSession } from '~/server/auth/client.server';
import {
  addRegistration,
  getDistinctUserEventCartRaces
} from '~/server/db/cart.server';
import { getUser } from '~/server/auth/session.server';
import { createBooking, findBooking } from '~/server/db/booking.server';
import { badRequest } from '~/utils/misc';
import { addParticipantsToRace } from '~/server/db/participant.server';
import i18n from '~/server/i18n.server';

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const form = await request.formData();
  const clientSession = await getClientSession(request);
  const authClient = await getUser(request);

  const clientId =
    authClient !== null ? authClient.id : clientSession.getClientId();
  const raceId = form.get('raceId') as string;
  const eventId = form.get('eventId') as string;

  const booking = await findBooking(clientId, eventId);

  try {
    if (booking) {
      return redirect(
        `/checkout/${
          booking.status === CheckoutStatus.checkout
            ? 'info'
            : booking.status === CheckoutStatus.pending
            ? 'payment'
            : 'confirmation'
        }/${eventId}`
      );
    } else {
      await addRegistration(clientId as string, raceId);
      await createInitialBookingFlow(clientId, eventId, t);
    }
  } catch (e) {
    console.log(e);

    return redirect('/');
  }

  return redirect(`/checkout/info/${eventId}`);
};

export async function createInitialBookingFlow(
  clientId: string,
  eventId: string,
  t: TFunction
) {
  const userCheckoutRaces = await getDistinctUserEventCartRaces(
    clientId,
    eventId
  );

  if (!userCheckoutRaces) {
    return badRequest({ error: t('No Races In Checkout') });
  }

  const pin = Math.floor(1000 + Math.random() * 9000);
  const booking = await createBooking(pin, eventId, clientId);

  if (!booking) {
    return badRequest({ error: t("Can't Create Booking") });
  }

  await addParticipantsToRace(
    userCheckoutRaces.map((u) => u.raceId),
    clientId,
    booking.id
  );

  return redirect(`/checkout/info/${eventId}`);
}
