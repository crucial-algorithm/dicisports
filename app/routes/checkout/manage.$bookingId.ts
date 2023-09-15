import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { CheckoutStatus } from '@prisma/client';
import { redirect } from 'react-router';

import { getClientSession } from '~/server/auth/client.server';
import { badRequest } from '~/utils/misc';
import { findRace } from '~/server/db/races.server';
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

  const clientId =
    authClient !== null ? authClient.id : clientSession.getClientId();
  const actionId = form.get('actionId') as string;
  const bookingId = params.bookingId as string;
  const booking = await findBookingById(bookingId);

  if (!booking || booking?.status === CheckoutStatus.confirmed) {
    return redirect('/');
  }

  if (booking.userId !== clientId) {
    throw Unauthorized(t('Not authorized'));
  }

  try {
    if (actionId === actions.removeParticipant) {
      const participantId = form.get('participantId') as string;
      const raceId = form.get('raceId') as string;
      const eventId = await findRace(raceId).then((p) => p?.eventId);

      await removeRaceParticipant(participantId, raceId);

      const raceParticipants = await findUserEventRaceParticipants(
        clientId,
        eventId as string
      );

      if (raceParticipants?.length === 0) {
        await removeBooking(clientId, eventId as string);
      }
    }

    if (actionId === actions.addParticipants) {
      const races = JSON.parse(form.get('races') as string);
      const eventId = await findRace(races[0]).then((p) => p?.eventId);
      const registrationId = await findBooking(
        clientId,
        eventId as string
      ).then((p) => p?.id);

      await addRaceParticipants(races, clientId, registrationId as string, eventId as string);
    }

    return json({ ok: true, action: actionId });
  } catch (e) {
    console.error(e);

    return badRequest({ errors: e });
  }
};
