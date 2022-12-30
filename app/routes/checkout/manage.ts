import type { ActionFunction } from 'remix';
import { json } from 'remix';

import { getClientSession } from '~/server/auth/client.server';
import { badRequest } from '~/utils/misc';
import {
  addRaceParticipants,
  findRegistration,
  removeRaceParticipant
} from '~/server/db/checkout.server';
import { findRace } from '~/server/db/races.server';

const actions = {
  removeParticipant: 'removeParticipant',
  addParticipants: 'addParticipants'
};

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const clientSession = await getClientSession(request);

  const clientId = clientSession.getClientId();
  const actionId = form.get('actionId') as string;

  try {
    if (actionId === actions.removeParticipant) {
      const participantId = form.get('participantId') as string;
      const raceId = form.get('raceId') as string;

      await removeRaceParticipant(participantId, raceId, clientId);
    }

    if (actionId === actions.addParticipants) {
      const races = JSON.parse(form.get('races') as string);
      const eventId = await findRace(races[0]).then((p) => p?.eventId);
      const registrationId = await findRegistration(
        clientId,
        eventId as string
      ).then((p) => p?.id);

      await addRaceParticipants(races, clientId, registrationId);
    }

    return json({ ok: true, action: actionId });
  } catch (e) {
    console.log(e);

    return badRequest({ errors: e });
  }
};
