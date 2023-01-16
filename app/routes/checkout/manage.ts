import type { ActionFunction } from 'remix';
import { json } from 'remix';

import { getClientSession } from '~/server/auth/client.server';
import { badRequest } from '~/utils/misc';
import {
  addRaceParticipants,
  findBooking,
  findUserRaceParticipants,
  removeBooking,
  removeRaceParticipant
} from '~/server/db/checkout.server';
import { findRace } from '~/server/db/races.server';
import { getUser } from '~/server/auth/session.server';

const actions = {
  removeParticipant: 'removeParticipant',
  addParticipants: 'addParticipants',
  resetParticipant: 'resetParticipant'
};

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const clientSession = await getClientSession(request);
  const authClient = await getUser(request);

  const clientId =
    authClient !== null ? authClient.id : clientSession.getClientId();
  const actionId = form.get('actionId') as string;

  try {
    if (actionId === actions.removeParticipant) {
      const participantId = form.get('participantId') as string;
      const raceId = form.get('raceId') as string;
      const eventId = await findRace(raceId).then((p) => p?.eventId);

      await removeRaceParticipant(participantId, raceId, clientId);

      const raceParticipants = await findUserRaceParticipants(
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

      await addRaceParticipants(races, clientId, registrationId as string);
    }

    return json({ ok: true, action: actionId });
  } catch (e) {
    console.log(e);

    return badRequest({ errors: e });
  }
};
