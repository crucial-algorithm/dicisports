import type { LoaderFunction } from '@remix-run/node';
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

export const loader: LoaderFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const clientSession = await getClientSession(request);
  const authClient = await getUser(request);
  const { searchParams } = new URL(request.url);

  const clientId =
    authClient !== null ? authClient.id : clientSession.getClientId();
  const raceId = searchParams.get('raceId') as string;
  const eventId = searchParams.get('eventId') as string;

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
    }

    return await createInitialBookingFlow(clientId, eventId, raceId, t);
  } catch (e) {
    console.log(e);

    return redirect('/');
  }
};

export async function createInitialBookingFlow(
  clientId: string,
  eventId: string,
  raceId: string,
  t: TFunction
) {

  const pin = Math.floor(1000 + Math.random() * 9000);
  const booking = await createBooking(pin, eventId, clientId);

  if (!booking) {
    return badRequest({ error: t("Can't Create Booking") });
  }

  await addParticipantsToRace([raceId], clientId, booking.id);

  return redirect(`/checkout/info/${eventId}`);
}
