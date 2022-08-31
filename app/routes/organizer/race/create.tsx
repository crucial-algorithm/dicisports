import type { ActionFunction } from 'remix';
import { redirect } from 'remix';

import { z, ZodError } from 'zod';

import { createRace, updateRace } from '~/server/db/races.server';

import { badRequest } from '~/utils/misc';
import type { CreateRaceInput } from '~/types';
import i18n from '~/server/i18n.server';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, RESOURCES_NS);
  const form = await request.formData();

  const eventId = form.get('event-id') as string;
  const raceId = form.get('race-id') as string;
  const name = form.get('name') as string;
  const hash = form.get('hash') as string;

  const raceData: CreateRaceInput = {
    id: raceId,
    name,
    distance: 10,
    startTime: 10,
    elevationGain: 20,
    elevationLoss: 20,
    price: 10,
    priceEarlyBird: 8,
    validUntil: null,
    raceDescription: 'lets run 10 miles',
    eventId
  };

  const required = { invalid_type_error: t('Field required') };
  const str5CharsOrMore = z
    .string(required)
    .min(5, { message: t('Min 5 chars') });
  const RaceSchema = z.object({
    name: str5CharsOrMore
    // elevationGain: z.number().nonnegative() TODO: add error message
  });

  try {
    RaceSchema.parse(raceData);
    raceId? await updateRace(raceData): await createRace(raceData);
    return redirect(`/organizer/event/${eventId}`);
  } catch (e) {
    if (!(e instanceof ZodError)) {
      console.error(e);
      return badRequest({
        error: 'We dont know what happened'
      });
    }
    console.log(e);

    const errors: { [key: string]: string | undefined } = {};

    for (const error of (e as ZodError).errors) {
      errors[error.path[0]] = error.message;
    }

    return badRequest({ errors, hash: parseInt(hash) });
  }
};
