import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { CheckoutStatus } from '@prisma/client';
import { redirect } from 'react-router';

import { getClientSession } from '~/server/auth/client.server';
import { badRequest } from '~/utils/misc';
import { getUser } from '~/server/auth/session.server';
import {
  addRaceParticipants,
  findUserEventRaceParticipants,
  removeRaceParticipant
} from '~/server/db/participant.server';
import {
  findBooking,
  findBookingById,
  removeBooking
} from '~/server/db/booking.server';
import i18n from '~/server/i18n.server';
import { Unauthorized } from '~/server/utils/misc';

const actions = {
  removeParticipant: 'removeParticipant',
  addParticipants: 'addParticipants',
  resetParticipant: 'resetParticipant'
};

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, 'checkout');

  const form = await request.formData();
  const clientSession = await getClientSession(request);
  const authClient = await getUser(request);

  const bookingOwnerId =
    authClient !== null ? authClient.id : clientSession.getClientId();
  const actionId = form.get('actionId') as string;
  const bookingId = params.bookingId as string;
  const booking = await findBookingById(bookingId);

  if (!booking) {
    return redirect('/');
  }

  if (booking.userId !== bookingOwnerId) {
    throw Unauthorized(t('Not authorized'));
  }

  if (booking.status !== CheckoutStatus.checkout) {
    return redirect(
      `/checkout/${
        booking.status === CheckoutStatus.confirmed ? 'confirmation' : 'payment'
      }/${bookingId}`
    );
  }

  const eventId = booking.eventId;

  try {
    if (actionId === actions.removeParticipant) {
      const participantId = form.get('participantId') as string;
      const raceId = form.get('raceId') as string;

      await removeRaceParticipant(participantId, raceId);

      const raceParticipants = await findUserEventRaceParticipants(
        bookingOwnerId,
        eventId as string
      );

      if (raceParticipants?.length === 0) {
        await removeBooking(bookingOwnerId, eventId as string);
      }
    }

    if (actionId === actions.addParticipants) {
      const races = JSON.parse(form.get('races') as string);
      const registrationId = await findBooking(
        bookingOwnerId,
        eventId as string
      ).then((p) => p?.id);

      await addRaceParticipants(races, bookingOwnerId, registrationId as string, eventId as string);
    }

    return json({ ok: true, action: actionId });
  } catch (e) {
    console.error(e);

    return badRequest({ errors: e });
  }
};
