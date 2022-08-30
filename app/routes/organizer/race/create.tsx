import type { ActionFunction } from 'remix';
import { redirect } from 'remix';

import { z, ZodError } from 'zod';

import { createRace } from '~/server/db/races.server';

import { badRequest } from '~/utils/misc';
import type { CreateRaceInput } from '~/types';
import Id from '~/server/utils/Id.server';

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();

  const eventId = form.get('event-id') as string;
  // const raceId = form.get('race-id') as string;
  const name = form.get('name') as string;

  const raceData: CreateRaceInput = {
    id: Id(),
    name: name,
    distance: 10,
    startTime: 10,
    elevationGain: 20,
    elevationLoss: 20,
    price: 10,
    priceEarlyBird: 8,
    validUntil: null,
    raceDescription: 'lets run 10 miles',
    eventId: eventId
  };

  const required = { invalid_type_error: 'Field required' };
  const str5CharsOrMore = z
    .string(required)
    .min(5, { message: 'name 5 chars or more' });
  const RaceSchema = z.object({
    name: str5CharsOrMore
    // elevationGain: z.number().nonnegative() TODO: add error message
  });

  try {
    RaceSchema.parse(raceData);
    await createRace(raceData);
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

    return badRequest({ errors });
  }
};
