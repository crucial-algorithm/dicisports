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
    console.log('non existing event... redirecting home');
    return redirect('/');
  }

  // This shouldn't happen, but in case it does, check if event is outdated
  if (event.startAt && new Date(event?.startAt) < new Date()) {
    console.log('Event is outdated... redirecting home');
    return redirect('/');
  }

  try {
    const bookingId = Id();

    if (!user) {
      console.log(`Creating anonymous ${userId} user for booking ${bookingId}`);
      // Found an issue in safari due to their tracking prevention mechanism - when we create a use with 
      //   the generated client id in this page, it actually assigns a different client id to the user on redirect.
      // This causes an access restriction in `/checkout/info/` because a different user is trying to access the booking. 
      // TODO: We need to find a way to handle this.
      try {
        await createAnonymousUser(userId, `bid-${bookingId}`);
      } catch (e) {
        // If we fail to create an anonymous user, we should still continue
        console.log(`Failed to create anonymous user ${userId}, exception caught ${bookingId}, error below:`);
        console.error(e);
      }
    }

    await createInitialBookingFlow(bookingId, userId, eventId, raceId, t);
    return redirect(`/checkout/info/${bookingId}`);
  } catch (e) {
    console.error(e);
    console.log('Error creating booking... redirecting home');
    return redirect('/');
  }
};

async function createInitialBookingFlow(
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
