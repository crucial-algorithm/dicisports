import type { ActionFunction } from 'remix';
import { json } from 'remix';

import { getClientSession } from '~/server/auth/client.server';
import { badRequest } from '~/utils/misc';
import {
  addRaceParticipants,
  changeToSelectedRaceParticipant,
  findBooking,
  removeRaceParticipant,
  resetParticipant
} from '~/server/db/checkout.server';
import { findRace } from '~/server/db/races.server';
import i18n from '~/server/i18n.server';

const actions = {
  removeParticipant: 'removeParticipant',
  addParticipants: 'addParticipants',
  selectParticipant: 'selectParticipant',
  resetParticipant: 'resetParticipant'
};

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const form = await request.formData();
  const clientSession = await getClientSession(request);

  const clientId = clientSession.getClientId();
  const actionId = form.get('actionId') as string;

  if (actionId === actions.selectParticipant) {
    const newUser = form.get('newUser') as string;
    const oldUser = form.get('oldUser') as string;
    const raceId = form.get('raceId') as string;
    const hash = form.get('hash') as string;

    try {
      await changeToSelectedRaceParticipant(newUser, oldUser, raceId);

      return json({ ok: true, action: actions.selectParticipant });
    } catch (e) {
      console.log(e);

      return badRequest({
        errors: { selectedParticipant: t('Existing Race Participant') },
        hash: parseInt(hash)
      });
    }
  }

  try {
    if (actionId === actions.removeParticipant) {
      const participantId = form.get('participantId') as string;
      const raceId = form.get('raceId') as string;

      await removeRaceParticipant(participantId, raceId, clientId);
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

    if (actionId === actions.resetParticipant) {
      const participantId = form.get('participantId') as string;
      const raceId = form.get('raceId') as string;

      await resetParticipant(participantId, clientId, raceId);
    }

    return json({ ok: true, action: actionId });
  } catch (e) {
    console.log(e);

    return badRequest({ errors: e });
  }
};
