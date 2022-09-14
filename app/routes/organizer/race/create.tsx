import type { ActionFunction } from 'remix';
import { redirect } from 'remix';

import { z, ZodError } from 'zod';

import { createRace, deleteRace, updateRace } from '~/server/db/races.server';

import { badRequest, hoursMinutesToTimeOfDay } from '~/utils/misc';
import type { CreateRaceInput } from '~/types';
import i18n from '~/server/i18n.server';
import { requireAdminUser } from '~/server/auth/session.server';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request }) => {
  // hide while this is still in dev
  await requireAdminUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);
  const form = await request.formData();

  const eventId = form.get('event-id') as string;
  const raceId = form.get('race-id') as string;
  const date = form.get('date') as string;
  const hash = form.get('hash') as string;
  const action = form.get('actionId');

  if (action === 'delete') {
    await deleteRace(raceId);

    return redirect(`/organizer/event/${eventId}`);
  }

  const raceData: CreateRaceInput = {
    id: raceId,
    name: form.get('name') as string,
    distance: parseFloat(form.get('distance') as string),
    startTime: hoursMinutesToTimeOfDay(
      parseInt(form.get('hour') as string, 10),
      parseInt(form.get('minute') as string, 10)
    ),
    elevationGain: parseInt(form.get('elevation-gain') as string),
    elevationLoss: parseInt(form.get('elevation-loss') as string) || null,
    price: parseFloat(form.get('price') as string),
    priceEarlyBird: parseFloat(form.get('price-early-bird') as string) || null,
    validUntil: date ? new Date(date) : null,
    raceDescription: (form.get('description') as string) || null,
    eventId
  };

  const required = { invalid_type_error: t('Field required') };
  const str5CharsOrMore = z
    .string(required)
    .min(5, { message: t('Min 5 chars') });
  const RaceSchema = z.object({
    name: str5CharsOrMore,
    distance: z
      .number({
        required_error: t('Field Required'),
        invalid_type_error: t('Must Be Number')
      })
      .positive({ message: t('Positive Number') }),
    startTime: z.number({ invalid_type_error: t('Start Time') }),
    elevationGain: z
      .number({
        required_error: t('Field Required'),
        invalid_type_error: t('Must Be Number')
      })
      .nonnegative({ message: t('Elevation Positive') }),
    elevationLoss: z
      .number({
        required_error: t('Field Required'),
        invalid_type_error: t('Must Be Number')
      })
      .nonnegative({ message: t('Elevation Positive') })
      .nullable(),
    price: z
      .number({
        required_error: t('Field Required'),
        invalid_type_error: t('Must Be Number')
      })
      .positive({ message: t('Positive Number') }),
    priceEarlyBird: z
      .number({
        required_error: t('Field Required'),
        invalid_type_error: t('Must Be Number')
      })
      .positive({ message: t('Positive Number') })
      .nullable(),
    validUntil: z
      .date()
      .min(new Date(), { message: t('Future Date') })
      .nullable()
  });

  try {
    RaceSchema.parse(raceData);
    raceId ? await updateRace(raceData) : await createRace(raceData);
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
