import type { ActionFunction } from 'remix';
import { redirect } from 'remix';

import { z, ZodError } from 'zod';

import { createRace } from '~/server/db/races.server';

import { badRequest } from '~/utils/misc';

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();

  const eventId = form.get('event-id') as string;
  const name = form.get('race-name') as string;
  const data = { name, eventId };

  const required = { invalid_type_error: 'Field required' };
  const str5CharsOrMore = z
    .string(required)
    .min(5, { message: 'name 5 chars or more' });
  const RaceSchema = z.object({
    name: str5CharsOrMore
    // elevationGain: z.number().nonnegative() TODO: add error message
  });

  try {
    RaceSchema.parse(data);
    await createRace(eventId, name);
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

    return badRequest({ error: undefined, errors });
  }

  return redirect(`/organizer/event/${eventId}`);
};