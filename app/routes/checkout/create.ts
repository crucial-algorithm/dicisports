import type { LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { CheckoutStatus } from '@prisma/client';
import type { TFunction } from 'i18next';

import { getClientSession } from '~/server/auth/client.server';
import { getUser } from '~/server/auth/session.server';
import { createBooking, findBooking } from '~/server/db/booking.server';
import { badRequest } from '~/utils/misc';
import { addParticipantsToRace } from '~/server/db/participant.server';
import i18n from '~/server/i18n.server';
import Id from '~/server/utils/Id.server';
import { findEvent } from '~/server/db/events.server';

export const loader: LoaderFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const clientSession = await getClientSession(request);
  const authClient = await getUser(request);
  const { searchParams } = new URL(request.url);

  const clientId =
    authClient !== null ? authClient.id : clientSession.getClientId();
  const raceId = searchParams.get('raceId') as string;
  const eventId = searchParams.get('eventId') as string;
  const event = await findEvent(eventId);

  if (!event) {
    return redirect('/');
  }

  if (event.startAt && new Date(event?.startAt) > new Date()) {
    return redirect('/');
  }

  //TODO: delete this validation in order to create many bookings to the same event
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
        }/${booking.id}`
      );
    }

    const bookingId = Id();

    await createInitialBookingFlow(bookingId, clientId, eventId, raceId, t);
    return redirect(`/checkout/info/${bookingId}`);
  } catch (e) {
    console.log(e);

    return redirect('/');
  }
};

export async function createInitialBookingFlow(
  bookingId: string,
  clientId: string,
  eventId: string,
  raceId: string,
  t: TFunction
) {

  const pin = Math.floor(1000 + Math.random() * 9000);
  const booking = await createBooking(bookingId, pin, eventId, clientId);

  if (!booking) {
    return badRequest({ error: t("Can't Create Booking") });
  }

  await addParticipantsToRace([raceId], clientId, booking.id, eventId);
}
