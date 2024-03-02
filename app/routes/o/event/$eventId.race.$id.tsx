import path from 'path';

import { Readable } from 'stream';

import { ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';
import type {
  ActionFunction,
  LoaderFunction,
  UploadHandler
} from '@remix-run/node';
import {
  json,
  redirect,
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from '@remix-run/node';
import { Link, useActionData, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import type { Event, Race } from '@prisma/client';

import { z, ZodError } from 'zod';

import HourOfDay from '~/components/HourOfDay';
import Button, { ButtonLink } from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';
import BasicDatePicker from '~/components/shared/form/DatePicker';
import FormField from '~/components/shared/form/FormField';
import InputError from '~/components/shared/form/InputError';
import TextArea from '~/components/shared/form/TextArea';
import TextField from '~/components/shared/form/TextField';
import UploadForm from '~/components/shared/form/UploadForm';
import Main from '~/components/shared/Main';
import { H6, Paragraph } from '~/components/shared/typography';
import { requireUser } from '~/server/auth/session.server';
import { findEvent } from '~/server/db/events.server';
import { createRace, findRace, updateRace } from '~/server/db/races.server';
import i18n from '~/server/i18n.server';
import Id from '~/server/utils/Id.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';
import { uploadToS3 } from '~/server/utils/s3';
import type { CreateRaceInput } from '~/types';
import {
  badRequest,
  hoursMinutesToTimeOfDay,
  timeOfDayToHoursMinutes
} from '~/utils/misc';
import ScrollToTop from '~/components/ScrollToTop';

type LoaderData = {
  event: Event;
  race: Race | null;
};

type ActionData = {
  errors?: FormErrors;
};

type FormErrors = {
  name?: string;
  distance?: string;
  startTime?: string;
  elevationGain?: string;
  elevationLoss?: string;
  price?: string;
  priceEarlyBird?: string;
  validUntil?: string;
  priceLateBird?: string;
  applyAfter?: string;
  inconsistentDates?: string;
};

const RESOURCES_NS = 'create-event-form';

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const eventId = params.eventId as string;
  const raceId = params.id as string;
  const t = await i18n.getFixedT(request, RESOURCES_NS);

  if (!eventId || !raceId) {
    return redirect('/o');
  }

  const event = await findEvent(eventId);

  if (!event) {
    throw NotFound(t('Event not found'));
  }

  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  const race = raceId === 'new' ? null : await findRace(raceId);

  if (race && race.eventId !== eventId) {
    // weird - just in case, verify consistency in route
    throw NotFound(t('Race not found'));
  }

  return json({
    event,
    race
  });
};

export const action: ActionFunction = async ({ params, request }) => {
  const user = await requireUser(request);
  const t = await i18n.getFixedT(request, RESOURCES_NS);

  let raceId = params.id || null;
  const isInsert: boolean = raceId === 'new';

  if (raceId === 'new') {
    raceId = Id();
  }

  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, data, filename }) => {
      if (name !== 'track') {
        return undefined;
      }

      if (filename === undefined || filename.length === 0) {
        return undefined;
      }

      const eventId = params.eventId as string;
      const fileExtension = path.parse(filename as string).ext;

      const key = await uploadToS3(
        Readable.from(data),
        eventId,
        raceId + fileExtension
      );

      return `${key}|${raceId}`;
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );
  const form = await unstable_parseMultipartFormData(request, uploadHandler);
  const eventId = params.eventId as string;
  const earlyBirdValidUntil = form.get('earlyBirdValidUntil') as string;
  const lateBirdAppliesAfter = form.get('lateBirdApplyAfter') as string;
  const deletedGPX = form.get('deletedGPX');
  const uploadResult = form.get('track') as string;
  let track: string | null = null;
  let trackAssignedId: string | undefined;
  const event = await findEvent(eventId);

  if (!event) {
    throw NotFound(t('Event not found'));
  }
  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  if (uploadResult && uploadResult.length > 0) {
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
    price: parseFloat(form.get('price') as string) * 1000,
    priceEarlyBird:
      parseFloat(form.get('priceEarlyBird') as string) * 1000 || null,
    validUntil: earlyBirdValidUntil ? new Date(earlyBirdValidUntil) : null,
    priceLateBird:
      parseFloat(form.get('priceLateBird') as string) * 1000 || null,
    applyAfter: lateBirdAppliesAfter ? new Date(lateBirdAppliesAfter) : null,
    raceDescription: (form.get('description') as string) || null,
    track,
    eventId
  };

  const required = { invalid_type_error: t('Field required') };
  const str5CharsOrMore = z
    .string(required)
    .min(1, { message: t('Min 1 chars') });
  const RaceSchema = z
    .object({
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
        .max(event.startAt ? event.startAt : new Date('2099-12-31'), {
          message: t('Date Must Be Before Event Date')
        })
        .nullable(),
      priceLateBird: z
        .number({
          required_error: t('Field Required'),
          invalid_type_error: t('Must Be Number')
        })
        .positive({ message: t('Positive Number') })
        .optional()
        .nullable(),
      applyAfter: z
        .date()
        .max(event.startAt ? event.startAt : new Date('2099-12-31'), {
          message: t('Date Must Be Before Event Date')
        })
        .optional()
        .nullable()
    })
    .refine(
      (schema) =>
        (schema.priceEarlyBird === null && schema.validUntil === null) ||
        (schema.priceEarlyBird !== null && schema.validUntil !== null),
      {
        message: t(
          raceData.priceEarlyBird === null
            ? 'Insert Valid Price'
            : 'Insert Valid Date'
        ),
        path: [
          raceData.priceEarlyBird === null ? 'priceEarlyBird' : 'validUntil'
        ]
      }
    )
    // if early bird price is null, return true to ignore refine, otherwise it will trigger an error
    .refine(
      (s) =>
        !s.priceEarlyBird
          ? true
          : s.priceEarlyBird && s.price > s.priceEarlyBird,
      {
        message: t('Cheaper Early Bird', { price: raceData.price / 1000 }),
        path: ['priceEarlyBird']
      }
    )
    .refine(
      (schema) =>
        (schema.priceLateBird === null && schema.applyAfter === null) ||
        (schema.priceLateBird !== null && schema.applyAfter !== null),
      {
        message: t(
          raceData.priceLateBird === null
            ? 'Insert Valid Price'
            : 'Insert Valid Date'
        ),
        path: [
          raceData.priceLateBird === null ? 'priceLateBird' : 'lateBirdAfter'
        ]
      }
    )
    // if later bird price is null, return true to ignore refine, otherwise it will trigger an error
    .refine(
      (s) =>
        !s.priceLateBird ? true : s.priceLateBird && s.price < s.priceLateBird,
      {
        message: t('Expensive Late Bird', { price: raceData.price / 1000 }),
        path: ['priceLateBird']
      }
    )
    .refine(
      (s) =>
        !s.validUntil || !s.applyAfter
          ? true
          : new Date(s.applyAfter).getTime() > new Date(s.validUntil).getTime(),
      {
        message: t('Late Bird Must be after Early Bird'),
        path: ['inconsistentDates']
      }
    );

  try {
    RaceSchema.parse(raceData);

    isInsert
      ? await createRace(raceData)
      : await updateRace(raceData, deletedGPX === 'true');

    return redirect(`/o/event/${event.id}#races`);
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

    return badRequest({ errors });
  }
};

export default function RaceRoute() {
  const { event, race } = useLoaderData() as unknown as LoaderData;
  const actionData = useActionData() as ActionData;

  const { t } = useTranslation(RESOURCES_NS);
  const [uploadedGPX, setUploadedGPX] = useState<string | null>(null);
  const [deletedGPX, setDeletedGPX] = useState<boolean>(false);
  const [hour, minute] = timeOfDayToHoursMinutes(
    race?.startTime ? race.startTime : hoursMinutesToTimeOfDay(9, 0)
  );
  const main = window.document.querySelector('#organizer-main-container');

  function FileListItems(files: File[]) {
    const dt = new ClipboardEvent('').clipboardData || new DataTransfer();

    for (let i = 0, len = files.length; i < len; i++) {
      dt.items.add(files[i]);
    }

    return dt.files;
  }

  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: '.gpx',
    onDrop: (accepted) => {
      if (accepted.length === 0) {
        return;
      }
      const file: File = accepted[0] as File;

      if (!inputEl || !inputEl.current) {
        return;
      }

      // @ts-ignore
      inputEl.current.files = new FileListItems([file]);
      setUploadedGPX(file.name);
    }
  });
  const inputProps = getInputProps();
  // @ts-ignore
  const inputEl = inputProps.ref;

  function handleDeleteGPX() {
    setDeletedGPX(true);
    setUploadedGPX(null);
  }

  return (
    <Main>
      <ScrollToTop element={main as Element} />

      <UploadForm>
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="raceId" value={race?.id} />

        <div className="flex justify-end">
          <ButtonLink
            to={`/o/event/${event.id}`}
            className="flex md:hidden mb-2"
            variant="secondary"
          >
            {t('Back Button')}
          </ButtonLink>
        </div>

        <div className="flex flex-row justify-between items-center">
          <FormField label={t('Race name')} error={actionData?.errors?.name}>
            <TextField
              id="name"
              name="name"
              placeholder={t('Race Name Placeholder')}
              className="max-w-md"
              defaultValue={race?.name}
            />
          </FormField>
          <>
            <ButtonLink
              to={`/o/event/${event.id}`}
              className="hidden md:flex"
              variant="secondary"
            >
              {t('Back Button')}
            </ButtonLink>
          </>
        </div>

        <FormField
          label={t('Distance')}
          error={actionData?.errors?.distance}
          className="w-44"
        >
          <TextField
            name="distance"
            type="number"
            className="w-full"
            placeholder={t('Distance Placeholder')}
            defaultValue={race?.distance}
          />
        </FormField>

        <FormField
          label={t('Start At')}
          className="w-80"
          error={actionData?.errors?.startTime}
        >
          <HourOfDay hour={hour} minute={minute} />
        </FormField>

        <FormField
          className="w-44"
          label={t('D+')}
          error={actionData?.errors?.elevationGain}
        >
          <TextField
            name="elevationGain"
            type="number"
            className="w-full"
            placeholder={t('D+ Placeholder')}
            defaultValue={race?.elevationGain}
          />
        </FormField>
        <FormField
          className="w-44"
          label={t('D-')}
          error={actionData?.errors?.elevationLoss}
        >
          <TextField
            name="elevationLoss"
            type="number"
            className="w-full"
            placeholder={t('D- Placeholder')}
            defaultValue={race?.elevationLoss as number}
          />
        </FormField>

        <FormField
          className="w-44"
          label={t('Price')}
          error={actionData?.errors?.price}
        >
          <TextField
            name="price"
            type="number"
            className="w-44"
            step=".01"
            placeholder={t('Price Placeholder')}
            defaultValue={race && race.price ? race.price / 1000 : undefined}
          />
        </FormField>

        <div className="text-primary text-sm mb-4 w-full md:max-w-prose">
          <H6>{t('Modificações no preço (opcional)')}</H6>
          <Paragraph className="mb-1">
            {t('Race Prime Rapel Explanation line 1')}
          </Paragraph>
          <p className="text-secondary prose prose-light dark:prose-dark mb-1">
            {t('Race Prime Rapel Explanation line 2')}
          </p>
          <p className="text-secondary prose prose-light dark:prose-dark">
            {t('Race Prime Rapel Explanation line 3')}
          </p>
        </div>

        <div className="flex flex-wrap ml-2 w-full gap-3.5">
          <FormField
            label={t('Price Early Bird')}
            error={actionData?.errors?.priceEarlyBird}
          >
            <TextField
              id="race-early-bird"
              name="priceEarlyBird"
              type="number"
              className="w-28"
              placeholder={t('Price Early Bird Placeholder')}
              step="1"
              defaultValue={
                race && race.priceEarlyBird
                  ? race.priceEarlyBird / 1000
                  : undefined
              }
            />
          </FormField>

          <FormField
            label={t('Valid Until')}
            className="w-44"
            error={actionData?.errors?.validUntil}
          >
            <BasicDatePicker
              label=""
              name="earlyBirdValidUntil"
              date={race?.validUntil ? new Date(race.validUntil) : null}
              maxDate={event.startAt ? new Date(event.startAt) : undefined}
              className="w-full py-3.5 px-4"
            />
          </FormField>
        </div>

        <div className="flex flex-wrap ml-2 w-full gap-3.5">
          <FormField
            label={t('Price Late Bird')}
            error={actionData?.errors?.priceLateBird}
          >
            <TextField
              id="race-late-bird"
              name="priceLateBird"
              type="number"
              className="w-28"
              placeholder={t('Price Late Bird Placeholder')}
              step="1"
              defaultValue={
                race && race.priceLateBird
                  ? race.priceLateBird / 1000
                  : undefined
              }
            />
          </FormField>

          <FormField
            label={t('Late Bird After')}
            className="w-44"
            error={actionData?.errors?.applyAfter}
          >
            <BasicDatePicker
              label=""
              name="lateBirdApplyAfter"
              date={race?.applyAfter ? new Date(race.applyAfter) : null}
              className="w-full py-3.5 px-4"
              maxDate={event.startAt ? new Date(event.startAt) : undefined}
            />
          </FormField>
        </div>

        {actionData?.errors?.inconsistentDates && (
          <InputError className="mt-[-24px] mb-8" id="inconsistent-dates">
            {actionData?.errors?.inconsistentDates}
          </InputError>
        )}

        <FormField label={t('Description')}>
          <div className="mt-1 relative rounded-md">
            <TextArea
              name="description"
              className="input-text h-40 p-2 max-w-lg"
              defaultValue={race?.raceDescription || ''}
            />
          </div>
        </FormField>

        {(!race?.track || deletedGPX) && (
          <FormField label={t('GPX')}>
            <section
              className={clsx(
                'h-40 bg-gray-100 text-black placeholder-gray-500 text-lg font-medium',
                'dark:disabled:text-blueGray-500 dark:text-white dark:bg-gray-800',
                'object-cover object-left-top overflow-hidden',
                'flex content-center justify-center cursor-pointer'
              )}
            >
              <div
                {...getRootProps({
                  className: 'h-80 w-full overflow-hidden'
                })}
              >
                <input {...inputProps} name="track" ref={inputEl} />
                <p
                  className={clsx(
                    'h-40 w-full flex items-center align-middle text-center justify-center p-2 text-gray-500',
                    {
                      'text-gray-900 text-left': uploadedGPX
                    }
                  )}
                >
                  {uploadedGPX ? uploadedGPX : t('GPX Dropzone')}
                </p>
              </div>
            </section>
          </FormField>
        )}

        {race?.track && !deletedGPX && (
          <div className="relative flex mb-4 w-80 items-center flex-row p-4">
            <div className="flex flex-row items-center">
              <div className={clsx('text-lg font-extrabold dark:text-white')}>
                {t('Download GPX File')}
              </div>
            </div>
            <div>
              <Link
                to={`/event/${event.id}/race/${race?.id}/gpx`}
                target="_blank"
                rel="noreferrer"
                className="group relative inline-flex ml-14 text-gray-700 dark:text-white"
                download
              >
                <ArrowDownTrayIcon className="md:h-6 w-6 m-0 inline-block text-black dark:text-blueGray-500" />
              </Link>
              <button
                className="group relative inline-flex ml-6 dark:text-blueGray-500"
                type="button"
                onClick={handleDeleteGPX}
              >
                <TrashIcon className="md:h-6 w-6 m-0 inline-block"></TrashIcon>
              </button>
            </div>
          </div>
        )}

        <ButtonGroup>
          <ButtonLink
            variant="secondary"
            type="submit"
            to={`/o/event/${event.id}#races`}
            id="cancel-button"
          >
            {t('Cancel')}
          </ButtonLink>
          <Button type="submit" name="create-race-button">
            {race?.id ? t('Update Distance') : t('Create Distance')}
          </Button>
        </ButtonGroup>
      </UploadForm>
    </Main>
  );
}
