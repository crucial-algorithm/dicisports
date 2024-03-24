import type { LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import type { TFunction } from 'i18next';

import { getClientSession } from '~/server/auth/client.server';
import { getUser } from '~/server/auth/session.server';
import { createBooking } from '~/server/db/booking.server';
import { badRequest } from '~/utils/misc';
import { addParticipantsToRace } from '~/server/db/participant.server';
import i18n from '~/server/i18n.server';
import Id from '~/server/utils/Id.server';
import { findEvent } from '~/server/db/events.server';
import { createAnonymousUser } from '~/server/db/users.server';

export const loader: LoaderFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const clientSession = await getClientSession(request);
  const user = await getUser(request);
  const { searchParams } = new URL(request.url);

  const userId =
    user !== null ? user.id : clientSession.getClientId();
  const raceId = searchParams.get('raceId') as string;
  const eventId = searchParams.get('eventId') as string;
  const event = await findEvent(eventId);

  if (!event) {
    return redirect('/');
  }

  // This shouldn't happen, but in case it does, check if event is outdated
  if (event.startAt && new Date(event?.startAt) < new Date()) {
    return redirect('/');
  }

  try {
    const bookingId = Id();

    if (!user) {
      console.log(`Creating anonymous user for booking ${bookingId}`);
      await createAnonymousUser(userId, `bid-${bookingId}`);
    }

    await createInitialBookingFlow(bookingId, userId, eventId, raceId, t);
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
