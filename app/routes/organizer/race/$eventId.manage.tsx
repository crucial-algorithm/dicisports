import path from 'path';

import { Readable } from 'stream';

import type { UploadHandler } from '@remix-run/node';
import { unstable_composeUploadHandlers } from '@remix-run/node';

import type { ActionFunction } from 'remix';
import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from 'remix';

import { z, ZodError } from 'zod';

import { createRace, deleteRace, updateRace } from '~/server/db/races.server';

import { badRequest, hoursMinutesToTimeOfDay } from '~/utils/misc';
import type { CreateRaceInput } from '~/types';
import i18n from '~/server/i18n.server';
import { requireAdminUser } from '~/server/auth/session.server';

import { uploadToS3 } from '~/server/utils/s3';

import Id from '~/server/utils/Id.server';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ params, request }) => {
  // hide while this is still in dev
  await requireAdminUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, contentType, data, filename }) => {
      if (!name.startsWith('file')) {
        return undefined;
      }

      const [, raceId] = name.split('/');
      const eventId = params.eventId as string;
      const fileExtension = path.parse(filename as string).ext;
      const id = raceId || Id();

      const key = await uploadToS3(
        Readable.from(data),
        eventId,
        id + fileExtension
      );

      return `${key}|${id}`;
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  const form = await unstable_parseMultipartFormData(request, uploadHandler);

  const eventId = params.eventId as string;
  const raceId = form.get('raceId') as string;
  const date = form.get('date') as string;
  const hash = form.get('hash') as string;
  const action = form.get('actionId');
  const deletedGPX = form.get('deletedGPX');
  const uploadResult = form.get(raceId ? `file/${raceId}` : 'file') as string;
  let track: string | null = null;
  let trackAssignedId: string | null = null;

  if (uploadResult) {
    const [path, id] = uploadResult.split('|');

    track = path;
    trackAssignedId = id;
  }

  const raceData: CreateRaceInput = {
    id: !raceId ? trackAssignedId : raceId,
    name: form.get('name') as string,
    distance: parseFloat(form.get('distance') as string),
    startTime: hoursMinutesToTimeOfDay(
      parseInt(form.get('hour') as string, 10),
      parseInt(form.get('minute') as string, 10)
    ),
    elevationGain: parseInt(form.get('elevationGain') as string),
    elevationLoss: parseInt(form.get('elevationLoss') as string) || null,
    price: parseFloat(form.get('price') as string),
    priceEarlyBird: parseFloat(form.get('priceEarlyBird') as string) || null,
    validUntil: date ? new Date(date) : null,
    raceDescription: (form.get('description') as string) || null,
    track,
    eventId
  };

  console.log(raceData);
  const required = { invalid_type_error: t('Field required') };
  const str5CharsOrMore = z
    .string(required)
    .min(1, { message: t('Min 1 chars') });
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
    if (action === 'delete' && raceId) {
      await deleteRace(raceId);

      return json({ ok: true });
    }
    RaceSchema.parse(raceData);
    raceId ? await updateRace(raceData, deletedGPX === 'true') : await createRace(raceData);
    return json({ ok: true });
  } catch (e) {
    if (!(e instanceof ZodError)) {
      console.error(e);
      return badRequest({
        error: 'We dont know what happened'
      });
    }

    const errors: { [key: string]: string | undefined } = {};

    for (const error of (e as ZodError).errors) {
      errors[error.path[0]] = error.message;
    }

    return badRequest({ errors, hash: parseInt(hash) });
  }
};
