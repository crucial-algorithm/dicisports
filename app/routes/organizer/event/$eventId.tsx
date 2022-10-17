import { useActionData, useFetcher, useLoaderData } from '@remix-run/react';
import type { ActionFunction, LinksFunction, LoaderFunction } from 'remix';
import {
  json,
  redirect,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from 'remix';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { z, ZodError } from 'zod';

import mapBoxGlCss from 'mapbox-gl/dist/mapbox-gl.css';

import type { UploadHandler } from '@remix-run/node';
import { unstable_composeUploadHandlers } from '@remix-run/node';

import { useTranslation } from 'react-i18next';

import {
  ChevronDownIcon,
  ChevronUpIcon,
  MapPinIcon,
  PlusIcon,
  TrashIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

import clsx from 'clsx';
import { useDropzone } from 'react-dropzone';
import { Status } from '@prisma/client';

import BasicDatePicker from '~/components/shared/form/DatePicker';
import PickBookingSystem from '~/components/PickBookingSystem';
import { MapDialog } from '~/components/shared/Map';

import mapCss from '~/styles/map.css';
import organizerCss from '~/styles/organizer.css';
import UploadImage from '~/components/shared/form/UploadImage';

import type {
  CreateEventInput,
  DiciLocation,
  Document,
  Event,
  Language,
  Perk,
  Race,
  Sport
} from '~/types';
import TextField from '~/components/shared/form/TextField';
import Button, { ButtonLink } from '~/components/shared/Button';

import { inputBaseClasses } from '~/components/shared/form/InputBase';
import Config from '~/server/config.server';
import { findSports } from '~/server/db/sports.server';
import {
  findEvent,
  publishEvent,
  updateEvent,
  unpublishEvent
} from '~/server/db/events.server';
import Main from '~/components/shared/Main';
import FormField from '~/components/shared/form/FormField';
import { H2, H3, H6, Paragraph } from '~/components/shared/typography';

import UploadForm from '~/components/shared/form/UploadForm';

import { uploadImageToCloudinary } from '~/server/storage/cloudinary.server';
import ComboBox from '~/components/shared/form/ComboBox';
import {
  NotFound,
  parseLocation,
  processImgField,
  Unauthorized
} from '~/server/utils/misc';
import i18n from '~/server/i18n.server';
import {
  badRequest,
  hoursMinutesToTimeOfDay,
  timeOfDayToHoursMinutes
} from '~/utils/misc';

import { findEventPerks } from '~/server/db/perks.server';
import { findEventRaces } from '~/server/db/races.server';
import Label from '~/components/shared/form/Label';
import WhenListEmpty from '~/components/shared/Empty';
import HourOfDay from '~/components/HourOfDay';
import { Spacer } from '~/components/shared/Spacer';
import { requireAdminUser, requireUser } from '~/server/auth/session.server';
import ButtonGroup from '~/components/shared/ButtonGroup';
import InputError from '~/components/shared/form/InputError';

type ActionData = {
  hash: number;
  errors?: {
    name?: string;
    startAt?: string;
    address?: string;
    externalBookingUrl?: string;
    eventDescription?: string;
    directions?: string;
    submit?: string;
  };
};

const actionIds = {
  publish: 'publish',
  unpublish: 'unpublish'
};

const RESOURCES_NS = 'create-event-form';

type LoaderData = {
  sports: Array<Sport>;
  mapToken: string;
  imageUploadPreset: string;
  event: SportEvent | null;
  perks: Array<Perk>;
  races: Array<Race>;
};

type SportEvent = Event & {
  documents?: Array<Document>;
};

export const handle = {
  i18n: ['common', 'create-event-form']
};

export const loader: LoaderFunction = async ({ request, params }) => {
  // hide while this is still in dev
  await requireAdminUser(request);
  const user = await requireUser(request);

  const sports = await findSports();
  const eventId = params.eventId as string;
  const event = eventId ? await findEvent(eventId) : null;

  const { MAPBOX_TOKEN, CLOUDINARY_UPLOAD_PRESET } = Config();

  if (!event || event.createdById !== user.id) {
    return redirect('/organizer');
  }

  return json({
    mapToken: MAPBOX_TOKEN,
    imageUploadPreset: CLOUDINARY_UPLOAD_PRESET,
    event,
    sports: sports.map((sport) => {
      return { id: sport.id, name: sport.name };
    }),
    perks: await findEventPerks(eventId),
    races: await findEventRaces(eventId)
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  // hide while this is still in dev
  await requireAdminUser(request);
  const user = await requireUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);
  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, data, filename }) => {
      if (!name.startsWith('/file/image') || !filename) {
        return undefined;
      }
      const uploadedImage = await uploadImageToCloudinary(data);

      return uploadedImage.public_id;
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  const event = params.eventId ? await findEvent(params.eventId) : null;

  if (!event) {
    throw NotFound(t('Event not found'));
  }
  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  const form = await unstable_parseMultipartFormData(request, uploadHandler);

  const isUpdate = event.status !== 'auto';
  const date = form.get('date') as string;
  const image1 = form.get('/file/image/0') as string;
  const image2 = form.get('/file/image/1') as string;
  const image3 = form.get('/file/image/2') as string;
  const image4 = form.get('/file/image/3') as string;
  const image5 = form.get('/file/image/4') as string;
  const location = parseLocation(form.get('location') as string);
  const actionId = form.get('actionId') as string;
  const races: Race[] = (await findEventRaces(event.id)) || [];

  const data: CreateEventInput = {
    id: params.eventId as string,
    name: form.get('name') as string,
    sportId: parseInt(form.get('sport') as string),
    startAt: new Date(date), //TODO: hour
    location: `${location.lat},${location.lng}`,
    address: location.address,
    useExternalBooking: form.get('booking') === 'external',
    externalBookingUrl: (form.get('booking-url') as string) || null,
    eventDescription: (form.get('description') as string) || null,
    directions: (form.get('get-there') as string) || null,
    image1: processImgField(image1, isUpdate),
    image2: processImgField(image2, isUpdate),
    image3: processImgField(image3, isUpdate),
    image4: processImgField(image4, isUpdate),
    image5: processImgField(image5, isUpdate)
  };

  const perks: string[] = form.getAll('perks') as string[];
  const newPerks: string[] = form.getAll('new-perk-input') as string[];

  const EventSchema = z
    .object({
      name: z
        .string({ required_error: t('Field Required') })
        .min(5, { message: t('Min 5 chars') }),
      sportId: z
        .number()
        .nonnegative({ message: t('Nonexistent Sport') })
        .lte(7, { message: t('Nonexistent Sport') }),
      startAt: z.date().min(new Date(), { message: t('Future Date') }),
      address: z.string({ required_error: t('Field required') }),
      useExternalBooking: z.boolean({
        invalid_type_error: t('Invalid Type')
      }),
      externalBookingUrl: z
        .string({ invalid_type_error: t('Invalid Type') })
        .url()
        .min(5, { message: t('Min 5 chars') })
        .nullable(),
      eventDescription: z
        .string({ invalid_type_error: t('Invalid Type') })
        .min(1, { message: t('Min 1 chars') })
        .nullable()
    })
    .refine(
      () =>
        (actionId === actionIds.publish && races.length > 0) ||
        actionId !== actionIds.publish,
      {
        message: t('At least 1 race'),
        path: ['submit']
      }
    );

  try {
    EventSchema.parse(data);
    await updateEvent(data, perks, newPerks);

    if (actionId === actionIds.publish) {
      await publishEvent(event.id as string, data.name);
    }

    if (actionId === actionIds.unpublish) {
      await unpublishEvent(event.id as string);
    }

    return json({});
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

export const links: LinksFunction = () => {
  return [
    {
      rel: 'stylesheet',
      href: mapBoxGlCss
    },
    {
      rel: 'stylesheet',
      href: mapCss
    },
    {
      rel: 'stylesheet',
      href: organizerCss
    }
  ];
};

function hackyEventRevival(event: Event | null): void {
  if (!event) {
    return;
  }
  // @ts-ignore
  event.startAt = new Date(event.startAt);
  // @ts-ignore
  event.endAt = new Date(event.endAt);
}

export default function OrganizerEventRoute() {
  type StrippedPerk = Omit<Perk, 'id' | 'eventId' | 'isDefault'> & {
    id: string | null;
  };
  const { t, i18n } = useTranslation('create-event-form');
  const language = i18n.language as Language;
  const {
    sports,
    mapToken,
    event,
    perks: dbPerks,
    races: dbRaces
  } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [showRacesDialog, setShowRacesDialog] = useState<{
    show: boolean;
    hash: number;
    race?: Race;
  }>({ show: false, hash: 0 });
  const [perks, setPerks] = useState<Array<StrippedPerk>>(dbPerks);
  const [races, setRaces] = useState<Array<Race>>(dbRaces);
  const [location, setLocation] = useState<DiciLocation | null>(
    event.address
      ? {
          coords: event.location,
          shortAddress: event.address
        }
      : null
  );
  const [showDocumentsDialog, setSowDocumentsDialog] = useState<{
    show: boolean;
    hash: number;
  }>({
    show: false,
    hash: 0
  });
  const [actionId, setActionId] = useState<string>('');
  const inputEl = useRef(null);
  const isPublished = event.status === Status.published;

  // Hack: while remix doesn't handle dates properly
  hackyEventRevival(event);

  function handleShowMap() {
    setShowLocationPicker(true);
  }

  function handleCreateRace() {
    setShowRacesDialog({ show: true, hash: Date.now() });
  }

  function handleCloseRace() {
    setShowRacesDialog({ show: false, hash: 0 });
  }

  function handleCloseMap(location: DiciLocation | null) {
    setShowLocationPicker(false);
    setLocation(location);
  }

  function handleOnCreatePerk(e: any) {
    if (!e.target.value) {
      return null;
    }

    const newPerks = [...perks];
    let max = newPerks[newPerks.length - 1].displayOrder;

    newPerks.push({
      id: null,
      name: e?.target?.value,
      isEnabled: true,
      displayOrder: ++max,
      createdAt: new Date()
    });
    setPerks(newPerks);

    if (inputEl.current) {
      (inputEl.current as HTMLInputElement).value = '';
    }
  }

  function handleOpenDocumentsDialog() {
    setSowDocumentsDialog({ show: true, hash: Date.now() });
  }

  function handleCloseDocumentsDialog() {
    setSowDocumentsDialog({ show: false, hash: 0 });
  }

  function handlePublish() {
    setActionId(actionIds.publish);
  }

  function handleUnpublish() {
    setActionId(actionIds.unpublish);
  }

  useEffect(() => {
    setRaces(dbRaces);
    setActionId('');
  }, [dbRaces]);

  return (
    <Main>
      <div className="mb-24">
        <UploadForm method="post" className="w-full">
          <div className="mb-12 lg:mb-20">
            <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
              <div>
                <H2>{t('Create Event')}</H2>
              </div>
              {event.status !== Status.auto && (isPublished ? (
                <Button onClick={handleUnpublish} type="submit" size="medium">
                  {t('Unpublish Button')}
                </Button>
              ) : (
                <Button onClick={handlePublish} type="submit" size="medium">
                  {t('Publish Button')}
                </Button>
              ))}

              <input type="hidden" name="actionId" value={actionId} />
            </div>
          </div>
          <FormField
            label={t('Name')}
            id="event-name"
            className="col-span-6 sm:col-span-4"
            error={actionData?.errors?.name}
          >
            <TextField
              name="name"
              id="event-name"
              placeholder={t('Event Name')}
              defaultValue={event.name || ''}
            />
          </FormField>
          <div className="flex flex-col flex-wrap md:flex-row lg:space-x-4">
            <FormField
              label={t('Sport')}
              id="event-sport"
              className="md:basis-1/2 lg:basis-1/4"
            >
              <ComboBox
                name="sport"
                id="event-sport"
                lang={language}
                placeholder=""
                defaultValue={event.sportId ? event.sportId : undefined}
                options={sports.map((s: Sport) => {
                  return { value: s.id, label: s.name };
                })}
              />
            </FormField>

            <FormField
              label={''}
              id="event-date"
              className="md:basis-1/2 md:pl-4 lg:pl-0 lg:basis-1/5"
              error={actionData?.errors?.startAt}
            >
              <BasicDatePicker
                label={t('Date')}
                name="date"
                date={event?.startAt}
              />
            </FormField>

            <FormField
              label={t('Location')}
              id="event-location"
              className="md:w-full lg:basis-1/3"
              error={actionData?.errors?.address}
            >
              <TextField
                name="discard-location"
                id="event-sport"
                defaultValue={location?.shortAddress}
                disabled={true}
                adornment={
                  <Button
                    className="mr-2"
                    variant="adornment"
                    type="button"
                    onClick={handleShowMap}
                  >
                    <MapPinIcon className="h-6 w-6 m-0 inline-block" />
                  </Button>
                }
              />
              <input
                type="hidden"
                name="location"
                value={
                  location
                    ? `${location?.coords}|${location?.shortAddress}`
                    : undefined
                }
              />
            </FormField>
          </div>

          <FormField
            label={t('Link to External Booking URL')}
            error={actionData?.errors?.externalBookingUrl}
          >
            <PickBookingSystem
              name="booking"
              t={t}
              useExternal={event?.useExternalBooking}
              url={event?.externalBookingUrl}
            />
          </FormField>
          <FormField label={t('Event Photos')} id="event-photos">
            <div className="w-full m-auto flex flex-col md:flex-row justify-begin gap-4 w-full md:grid-flow-col md:grid-rows-1 text-center">
              <UploadImage
                index={0}
                label={t('Hint For Picture 1')}
                defaultValue={event.image1}
                className="md:w-1/3"
              />
              <UploadImage
                index={1}
                label={t('Hint For Picture 2')}
                defaultValue={event.image2}
                className="md:w-1/3"
              />
              <UploadImage
                index={2}
                label={t('Hint For Picture 3')}
                defaultValue={event.image3}
                className="md:w-1/3"
              />
              <UploadImage
                index={3}
                label={t('Hint For Picture 4')}
                defaultValue={event.image4}
                className="md:w-1/3"
              />
              <UploadImage
                index={4}
                label={t('Hint For Picture 5')}
                defaultValue={event.image4}
                className="md:w-1/3"
              />
            </div>
          </FormField>

          <FormField
            label={t('Description')}
            error={actionData?.errors?.eventDescription}
          >
            <div className="mt-1 relative rounded-md shadow-sm">
              <textarea
                name="description"
                className={inputBaseClasses('p-10')}
                placeholder={t('Event description')}
                defaultValue={event.eventDescription || ''}
                rows={5}
                cols={50}
              />
            </div>
          </FormField>

          <FormField label={t('Perks')}>
            <div className="grid grid-rows-8 md:grid-rows-6 md:grid-flow-col gap-y-4 md:gap-y-2 mb-2">
              {perks
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((p: any) => (
                  <div key={p.id} className="flex items-center mb-1">
                    <input
                      type="checkbox"
                      id={p.id}
                      name={p.id ? 'perks' : 'new-perk-input'}
                      value={p.id ? p.id : p.name}
                      defaultChecked={p.isEnabled}
                      className="w-4 h-4 text-indigo-500 bg-gray-100 rounded border-gray-300 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label
                      htmlFor={p.id}
                      className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                    >
                      {p.name}
                    </label>
                  </div>
                ))}

              <div>
                <input
                  ref={inputEl}
                  name="new-perk-input"
                  type="text"
                  placeholder={t('Type to create new')}
                  onBlur={handleOnCreatePerk}
                  className="rounded-lg focus-ring text-sm w-60 md:text-sm bg-gray-100 text-black placeholder-gray-500 font-medium box-border dark:disabled:bg-gray-700 dark:text-white dark:bg-gray-800 disabled:text-gray-700 border-0 sm:col-span-4"
                />
              </div>
            </div>
          </FormField>

          <div id="races" className="mb-12">
            <Label
              htmlFor="races"
              className={clsx(
                'mb-5 flex justify-between items-center flex-row'
              )}
            >
              {t('Distances')}

              <Button
                className="hidden lg:flex"
                type="button"
                onClick={handleCreateRace}
              >
                {t('Create Distance')}
              </Button>

              <Button
                type="button"
                onClick={handleCreateRace}
                size="small"
                className="flex lg:hidden"
              >
                <PlusIcon className="md:h-6 w-6 m-0 inline-block"></PlusIcon>
              </Button>
            </Label>
            <div>
              <RacesList races={races} eventId={event.id} />
            </div>
            <WhenListEmpty list={races}>
              <H6 className="text-center p-12" variant="secondary" as="p">
                {t('No Races')}
              </H6>
            </WhenListEmpty>
            {actionData?.errors?.submit ? (
              <InputError className="mt-8" id="error-message">
                {actionData?.errors?.submit}
              </InputError>
            ) : null}
          </div>

          <FormField
            label={t('Directions')}
            error={actionData?.errors?.directions}
          >
            <div className="mt-2 relative rounded-md shadow-sm">
              <textarea
                name="get-there"
                className={inputBaseClasses('p-10')}
                placeholder={t('How to get there')}
                defaultValue={event.directions || ''}
                rows={5}
                cols={50}
              />
            </div>
          </FormField>

          <div id="races" className="mb-12">
            <Label
              htmlFor="races"
              className={clsx(
                'mb-5 flex justify-between items-center flex-row'
              )}
            >
              {t('Documents')}

              <Button
                className="hidden lg:flex"
                type="button"
                onClick={handleOpenDocumentsDialog}
              >
                {t('Upload Document')}
              </Button>
              <Button
                type="button"
                onClick={handleOpenDocumentsDialog}
                size="small"
                className="flex lg:hidden"
              >
                <PlusIcon className="md:h-6 w-6 m-0 inline-block"></PlusIcon>
              </Button>
            </Label>
            <div>
              <DocumentsList documents={event.documents} eventId={event.id} />
            </div>
            <WhenListEmpty list={event.documents}>
              <H6 className="text-center p-12" variant="secondary" as="p">
                {t('No Documents')}
              </H6>
            </WhenListEmpty>
          </div>

          <ButtonGroup className="mt-8">
            <ButtonLink type="button" variant="secondary" to={'/organizer'}>
              {t('Cancel')}
            </ButtonLink>

            <Button type="submit" variant="primary">
              {event.status === 'auto' ? t('Create Button') : t('Save Button')}
            </Button>
          </ButtonGroup>
        </UploadForm>
      </div>

      <RaceDialog
        isOpen={showRacesDialog.show}
        triggerModalClose={handleCloseRace}
        eventId={event.id}
        race={showRacesDialog.race}
        hash={showRacesDialog.hash}
      />

      <UploadDocumentDialog
        isOpen={showDocumentsDialog.show}
        onDismiss={handleCloseDocumentsDialog}
        eventId={event.id}
        hash={showDocumentsDialog.hash}
      />

      <MapDialog
        token={mapToken}
        defaultValue={location}
        open={showLocationPicker}
        onClose={handleCloseMap}
      />
    </Main>
  );
}

type FormErrors = {
  name?: string;
  distance?: string;
  startTime?: string;
  elevationGain?: string;
  elevationLoss?: string;
  price?: string;
  priceEarlyBird?: string;
  validUntil?: string;
  label?: string;
  path?: string;
};

function RaceDialog(props: {
  isOpen: boolean;
  triggerModalClose: () => void;
  eventId: string;
  race?: Race;
  hash: number;
}) {
  const { t } = useTranslation('create-event-form');
  const { isOpen, triggerModalClose, eventId, race, hash } = props;
  const fetcher = useFetcher();
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadedGPX, setUploadedGPX] = useState<string | null>(null);
  const [deletedGPX, setDeletedGPX] = useState<boolean>(false);
  const [hour, minute] = timeOfDayToHoursMinutes(
    race?.startTime ? race.startTime : hoursMinutesToTimeOfDay(9, 0)
  );

  const name = useRef<HTMLInputElement | null>(null);
  const distance = useRef<HTMLInputElement | null>(null);
  const startTime = useRef<HTMLInputElement | null>(null);
  const elevationGain = useRef<HTMLInputElement | null>(null);
  const elevationLoss = useRef<HTMLInputElement | null>(null);
  const price = useRef<HTMLInputElement | null>(null);
  const priceEarlyBird = useRef<HTMLInputElement | null>(null);
  const validUntil = useRef<HTMLInputElement | null>(null);
  const raceDescription = useRef<HTMLTextAreaElement | null>(null);

  const close = useCallback(() => {
    setErrors({});
    triggerModalClose();
    setUploadedGPX(null);
    setDeletedGPX(false);
  }, [triggerModalClose]);

  function handleSubmit() {
    let hour: undefined | number = undefined;
    let minute: undefined | number = undefined;

    if (startTime.current?.value) {
      const [h, m] = startTime.current.value.split(':').map(Number);

      hour = h;
      minute = m;
    }

    const payload = {
      raceId: race?.id ? race.id : '',
      name: name.current?.value,
      distance: distance.current?.value,
      hour,
      minute,
      elevationGain: elevationGain.current?.value,
      elevationLoss: elevationLoss.current?.value,
      price: price.current?.value,
      priceEarlyBird: priceEarlyBird.current?.value,
      date: validUntil.current?.value,
      description: raceDescription.current?.value,
      deletedGPX,
      hash
    };

    if (inputEl.current?.files[0]) {
      if (race && race.id) {
        // @ts-ignore
        payload[`file/${race.id}`] = inputEl.current?.files[0];
      } else {
        // @ts-ignore
        payload.file = inputEl.current?.files[0];
      }
    }

    // Payload types error
    // @ts-ignore
    fetcher.submit(payload, {
      method: 'post',
      action: `/organizer/race/${eventId}/manage`,
      encType: 'multipart/form-data'
    });
  }

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

  useEffect(() => {
    if (fetcher.type === 'actionReload' && fetcher.data.ok) {
      // reload & ok means success, since we return json({ ok: true })

      return close();
    }

    if (
      fetcher.type === 'done' &&
      fetcher.data?.errors &&
      fetcher.data?.hash === hash
    ) {
      return setErrors(fetcher.data.errors as FormErrors);
    }
  }, [fetcher, close, hash]);

  return (
    <div
      data-reach-dialog-overlay={true}
      className={clsx({
        'hidden ': !isOpen,
        'z-50 flex h-screen': isOpen
      })}
    >
      <div
        aria-modal={true}
        aria-label={t('Distance Modal')}
        className={clsx(
          'lg:w-5/6 w-full',
          'bg-white dark:bg-gray-900 font-extrabold',
          'lg:border-2 lg:border-black dark:lg:border-white lg:rounded-lg',
          {
            'hidden ': !isOpen,
            'm-auto': isOpen
          }
        )}
      >
        <div className="relative" key={hash}>
          <div className="px-6 py-2 flex flex-col lg:px-24 lg:py-14">
            <H3 className="w-full md:w-112 text-left">{t('Distance Modal')}</H3>
            <Spacer size="2xs" />

            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="raceId" value={race?.id} />
            <input type="hidden" name="hash" value={hash} />

            <FormField label={t('Race name')} error={errors?.name}>
              <TextField
                id="race-name"
                name="name"
                placeholder={t('Race Name Placeholder')}
                input={name}
                className="max-w-md"
                defaultValue={race?.name}
              />
            </FormField>

            <FormField
              label={t('Distance')}
              error={errors?.distance}
              className="w-full"
            >
              <TextField
                id="race-distance"
                name="distance"
                type="number"
                className="w-44"
                placeholder={t('Distance Placeholder')}
                input={distance}
                defaultValue={race?.distance}
              ></TextField>
            </FormField>

            <FormField
              label={t('Start At')}
              id="race-time-of-day"
              className="w-80"
              error={errors?.startTime}
            >
              <HourOfDay hour={hour} minute={minute} input={startTime} />
            </FormField>

            <FormField label={t('D+')} error={errors?.elevationGain}>
              <TextField
                id="race-elevation-gain"
                name="elevationGain"
                type="number"
                className="w-44"
                placeholder={t('D+ Placeholder')}
                input={elevationGain}
                defaultValue={race?.elevationGain}
              ></TextField>
            </FormField>
            <FormField label={t('D-')} error={errors?.elevationLoss}>
              <TextField
                id="race-elevation-loss"
                name="elevationLoss"
                type="number"
                className="w-44"
                placeholder={t('D- Placeholder')}
                input={elevationLoss}
                defaultValue={race?.elevationLoss as number}
              ></TextField>
            </FormField>

            <FormField label={t('Price')} error={errors?.price}>
              <TextField
                id="race-price"
                name="price"
                type="number"
                className="w-44"
                placeholder={t('Price Placeholder')}
                input={price}
                defaultValue={race?.price}
              ></TextField>
            </FormField>

            <div className="flex flex-wrap w-full">
              <FormField
                label={t('Price Early Bird')}
                error={errors?.priceEarlyBird}
                className="pr-3.5"
              >
                <TextField
                  id="race-early-bird"
                  name="priceEarlyBird"
                  type="number"
                  className="w-44"
                  placeholder={t('Price Early Bird Placeholder')}
                  input={priceEarlyBird}
                  defaultValue={race?.priceEarlyBird as number}
                ></TextField>
              </FormField>

              <FormField
                label={t('Valid Until')}
                id="event-date"
                className="w-56 w-full"
                error={errors?.validUntil}
              >
                <BasicDatePicker
                  label={''}
                  name="date"
                  date={race?.validUntil ? new Date(race.validUntil) : null}
                  input={validUntil}
                  className="w-full"
                />
              </FormField>
            </div>

            <FormField label={t('Description')}>
              <div className="mt-1 relative rounded-md shadow-sm">
                <textarea
                  name="description"
                  className={inputBaseClasses('p-10 max-w-lg')}
                  placeholder={t('Race Description')}
                  defaultValue={race?.raceDescription || ''}
                  ref={raceDescription}
                  rows={5}
                  cols={50}
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
                    'flex content-center justify-center'
                  )}
                >
                  <div
                    {...getRootProps({
                      className: 'h-80 w-full overflow-hidden'
                    })}
                  >
                    <input {...inputProps} name="" ref={inputEl} />
                    <p className="h-40 w-full flex items-center justify-center">
                      {t('GPX Dropzone')}
                    </p>
                  </div>
                </section>
              </FormField>
            )}
            {uploadedGPX && (
              <div
                className={clsx(
                  'text-md font-extrabold dark:text-white mt-4 ml-4'
                )}
              >
                {uploadedGPX}
              </div>
            )}

            {race?.track && !deletedGPX && (
              <div className="relative flex mb-4 justify-between items-center flex-row p-4">
                <div className="flex flex-row items-center">
                  <div
                    className={clsx('text-lg font-extrabold dark:text-white')}
                  >
                    {t('Download GPX File')}
                  </div>
                </div>
                <div>
                  <a
                    href={`/organizer/race/${race?.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative inline-flex ml-14 dark:text-blueGray-500"
                    download
                  >
                    {/*couldn't find import of icon*/}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                  </a>
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

            <ButtonGroup className="w-full md:w-112 flex flex-wrap gap-4 justify-begin mt-8">
              <Button variant="secondary" type="button" onClick={close}>
                {t('Cancel')}
              </Button>

              <Button type="button" onClick={handleSubmit}>
                {race?.id ? t('Update Distance') : t('Create Distance')}
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </div>
    </div>
  );
}

function RacesList(props: { races: Race[]; eventId: string }) {
  const { races, eventId } = props;
  const fetcher = useFetcher();

  const [showRacesDialog, setShowRacesDialog] = useState<{
    show: boolean;
    hash: number;
    race?: Race;
  }>({ show: false, hash: 0 });
  const [deleteModalOpen, setDeleteModalOpen] = useState<{
    show: boolean;
    race?: Race;
  }>({ show: false });

  function handleMoveUp(e: React.MouseEvent) {
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `/organizer/race/${e.currentTarget.id}/move-up`
      }
    );
  }

  function handleMoveDown(e: React.MouseEvent) {
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `/organizer/race/${e.currentTarget.id}/move-down`
      }
    );
  }

  function handleDeleteRace(e: React.MouseEvent) {
    const race = races.find((r) => r.id === e.currentTarget.id);

    if (!race) {
      // should never happen
      return;
    }
    setDeleteModalOpen({ show: true, race });
  }

  function handleDeleteRaceClose() {
    setDeleteModalOpen({ show: false });
  }

  function handleUpdateRace(e: React.MouseEvent) {
    const race = races.find((r) => r.id === e.currentTarget.id);

    if (!race) {
      // should never happen
      return;
    }

    setShowRacesDialog({ show: true, race, hash: Date.now() });
  }

  function handleCloseRace() {
    setShowRacesDialog({ show: false, hash: 0 });
  }

  return (
    <>
      <div>
        {races
          .sort((a: Race, b: Race) => a.displayOrder - b.displayOrder)
          .map((r: Race, index) => (
            <div
              key={r.id}
              className="relative flex mb-4 justify-between items-center flex-row flex-wrap border-b p-4 last:border-none border-gray-300 dark:border-gray-300"
            >
              <div className="flex flex-col items-center dark:text-blueGray-500">
                {index === 0 ? null : (
                  <button
                    type="button"
                    id={r.id}
                    onClick={handleMoveUp}
                    className="w-[24px] h-[24px]"
                  >
                    <ChevronUpIcon className="mh-6 w-6 m-0 inline-block" />
                  </button>
                )}
                {index === races.length - 1 ? null : (
                  <button
                    type="button"
                    id={r.id}
                    onClick={handleMoveDown}
                    className="w-[24px] h-[24px]"
                  >
                    <ChevronDownIcon className="md:h-6 w-6 m-0 inline-block" />
                  </button>
                )}
              </div>

              <div
                className="text-lg font-extrabold pl-3 dark:text-white w-[calc(100%-(24px+24px))]"
                id={r.id}
                onClick={handleUpdateRace}
              >
                {r.name}
              </div>

              <button
                type="button"
                id={r.id}
                onClick={handleDeleteRace}
                className="w-[24px] h-[24px] dark:text-blueGray-500"
              >
                <TrashIcon className="md:h-6 w-6 m-0 inline-block"></TrashIcon>
              </button>
            </div>
          ))}
      </div>
      <RaceDialog
        isOpen={showRacesDialog.show}
        triggerModalClose={handleCloseRace}
        eventId={eventId}
        race={showRacesDialog.race}
        hash={showRacesDialog.hash}
      />

      <DeleteRaceDialog
        isOpen={deleteModalOpen.show}
        onDismiss={handleDeleteRaceClose}
        race={deleteModalOpen.race}
        eventId={eventId}
      />
    </>
  );
}

function DeleteRaceDialog(props: {
  isOpen: boolean;
  onDismiss: () => void;
  race?: Race;
  eventId: string;
}) {
  const { t } = useTranslation(RESOURCES_NS);
  const { isOpen, onDismiss, race, eventId } = props;
  const fetcher = useFetcher();

  function handleSubmit() {
    fetcher.submit(
      { actionId: 'delete', raceId: race?.id as string },
      {
        method: 'post',
        action: `/organizer/race/${eventId}/manage`,
        encType: 'multipart/form-data'
      }
    );
  }

  useEffect(() => {
    if (fetcher.type === 'actionReload' && fetcher.data.ok) {
      onDismiss();
    }
  }, [fetcher, onDismiss]);

  return (
    <div
      data-reach-dialog-overlay={true}
      className={clsx({
        'hidden ': !isOpen,
        'z-50 flex h-screen': isOpen
      })}
    >
      <div
        aria-modal={true}
        className={clsx(
          'w-10/12 md:w-11/12 dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg px-8 py-10 lg:px-24 lg:py-14 lg:max-w-screen-lg',
          'w-10/12 md:w-11/12 dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg lg:px-24 lg:py-14 lg:max-w-screen-lg',
          {
            'hidden ': !isOpen,
            'm-auto': isOpen
          }
        )}
      >
        <H3>{t('Delete Race X', { name: race?.name })}</H3>
        <Paragraph>{t('Are you sure you want to delete race?')}</Paragraph>
        <Spacer size="2xs" />

        <ButtonGroup>
          <Button type="button" onClick={onDismiss}>
            {t('Ignore')}
          </Button>
          <Button
            variant="danger"
            size="medium"
            type="button"
            onClick={handleSubmit}
          >
            {t('Delete')}
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}

function UploadDocumentDialog(props: {
  isOpen: boolean;
  onDismiss: () => void;
  document?: Document;
  eventId: string;
  hash: number;
}) {
  const { isOpen, onDismiss, eventId, document, hash } = props;
  const { t } = useTranslation(RESOURCES_NS);
  const fetcher = useFetcher();
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadedDocument, setUploadedDocument] = useState<string | null>(null);
  const name = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setErrors({});
    onDismiss();
    setUploadedDocument(null);
  }, [onDismiss]);

  function handleSubmit() {
    const payload = {
      name: name.current?.value || '',
      documentId: document?.id ? document.id : '',
      hash: String(hash)
    };

    if (!document?.id) {
      // @ts-ignore
      payload['file'] = inputEl.current?.files[0];
    }

    fetcher.submit(payload, {
      method: 'post',
      action: `organizer/document/${eventId}/manage`,
      encType: 'multipart/form-data'
    });
  }

  function FileListItems(files: File[]) {
    const dt = new ClipboardEvent('').clipboardData || new DataTransfer();

    for (let i = 0, len = files.length; i < len; i++) {
      dt.items.add(files[i]);
    }

    return dt.files;
  }

  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: 'text/*, .pdf',
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
      setUploadedDocument(file.name);
    }
  });
  const inputProps = getInputProps();
  // @ts-ignore
  const inputEl = inputProps.ref;

  useEffect(() => {
    if (fetcher.type === 'actionReload' && fetcher.data.ok) {
      return close();
    }

    if (
      fetcher.type === 'done' &&
      fetcher.data?.errors &&
      fetcher.data?.hash === hash
    ) {
      return setErrors(fetcher.data.errors as FormErrors);
    }
  }, [close, fetcher, hash]);

  return (
    <div
      data-reach-dialog-overlay={true}
      className={clsx({
        'hidden ': !isOpen,
        'z-50 flex h-screen': isOpen
      })}
    >
      <div
        aria-modal={true}
        className={clsx(
          'h-full w-full lg:h-auto lg:w-11/12 px-8 py-8 md:px-24 md:py-14 ' +
            'dark:bg-gray-900  lg:max-w-screen-lg',
          'lg:border-2 lg:border-black dark:lg:border-white lg:rounded-lg lg:max-w-screen-lg',
          {
            'hidden ': !isOpen,
            'm-auto': isOpen
          }
        )}
      >
        <div className="relative" key={hash}>
          <H3 className="w-full md:w-112 text-left">
            {document?.id ? t('Update Document') : t('Upload Document')}
          </H3>
          <Spacer size="2xs" />

          <FormField label={t('Name')} error={errors?.label}>
            <TextField
              name="name"
              placeholder={t('Document Name')}
              defaultValue={document?.label ? document.label : ''}
              className="max-w-md"
              input={name}
            />
          </FormField>
          {!document && (
            <FormField label={t('Document')} error={errors?.path}>
              <section
                className={clsx(
                  'h-40 bg-gray-100 text-black placeholder-gray-500 text-lg font-medium',
                  'dark:disabled:text-blueGray-500 dark:text-white dark:bg-gray-800',
                  'object-cover object-left-top overflow-hidden',
                  'flex content-center justify-center'
                )}
              >
                <div
                  {...getRootProps({
                    className: 'h-80 w-full overflow-hidden'
                  })}
                >
                  <input {...inputProps} name="/file/misc/" ref={inputEl} />
                  <p className="h-40 w-full flex items-center justify-center">
                    {t('Document Dropzone')}
                  </p>
                </div>
              </section>
            </FormField>
          )}
          {uploadedDocument && (
            <div
              className={clsx(
                'text-md font-extrabold dark:text-white my-4 ml-4'
              )}
            >
              {uploadedDocument}
            </div>
          )}
          <ButtonGroup className="fixed w-5/6 m-auto bottom-2 lg:static lg:m-0">
            <Button type="button" variant="secondary" onClick={close}>
              {t('Cancel')}
            </Button>
            <Button type="button" onClick={handleSubmit}>
              {document?.id
                ? t('Update Document Button')
                : t('Upload Document Button')}
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </div>
  );
}

function DocumentsList(props: { documents: Document[]; eventId: string }) {
  const { documents, eventId } = props;
  const fetcher = useFetcher();
  const [showDocumentsDialog, setSowDocumentsDialog] = useState<{
    show: boolean;
    document?: Document;
    hash: number;
  }>({ show: false, hash: 0 });
  const [showDeleteDocumentDialog, setShowDeleteDocumentDialog] = useState<{
    show: boolean;
    document?: Document;
  }>({ show: false });

  function handleMoveUp(e: React.MouseEvent) {
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `organizer/document/${e.currentTarget.id}/move-up`
      }
    );
  }

  function handleMoveDown(e: React.MouseEvent) {
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `organizer/document/${e.currentTarget.id}/move-down`
      }
    );
  }

  function handleUpdateDocument(e: React.MouseEvent) {
    const document = documents.find((d) => d.id === e.currentTarget.id);

    if (!document) {
      return;
    }

    setSowDocumentsDialog({ show: true, document, hash: Date.now() });
  }

  function handleCloseDocumentsDialog() {
    setSowDocumentsDialog({ show: false, hash: 0 });
  }

  function handleOpenDeleteDocumentDialog(e: React.MouseEvent) {
    const document = documents.find((d) => d.id === e.currentTarget.id);

    if (!document) {
      return;
    }

    setShowDeleteDocumentDialog({ show: true, document });
  }

  function handleCloseDeleteDocumentDialog() {
    setShowDeleteDocumentDialog({ show: false });
  }

  return (
    <>
      <div>
        {documents
          .sort((a: Document, b: Document) => a.position - b.position)
          .map((d: Document, index) => (
            <div
              key={d.id}
              className="relative flex mb-4 justify-between items-center flex-row border-b p-4 last:border-none border-gray-300 dark:border-gray-300"
            >
              <div className="flex flex-col items-center dark:text-blueGray-500">
                {index === 0 ? null : (
                  <button
                    type="button"
                    id={d.id}
                    onClick={handleMoveUp}
                    className="w-[24px] h-[24px]"
                  >
                    <ChevronUpIcon className="md:h-6 w-6 m-0 inline-block" />
                  </button>
                )}
                {index === documents.length - 1 ? null : (
                  <button
                    type="button"
                    id={d.id}
                    onClick={handleMoveDown}
                    className="w-[24px] h-[24px]"
                  >
                    <ChevronDownIcon className="md:h-6 w-6 m-0 inline-block" />
                  </button>
                )}
              </div>

              <div
                className="text-lg text-left font-extrabold pl-3 dark:text-white w-[calc(100%-(24px+24px+24px))]"
                id={d.id}
                onClick={handleUpdateDocument}
              >
                {d.label}
              </div>

              <a
                href={`/organizer/document/${d.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <ArrowDownTrayIcon className="md:h-6 w-6 m-0 inline-block text-black dark:text-blueGray-500" />
              </a>
              <button
                type="button"
                id={d.id}
                onClick={handleOpenDeleteDocumentDialog}
                className="ml-3 w-[24px] h-[24px] dark:text-blueGray-500"
              >
                <TrashIcon className="md:h-6 w-6 m-0 inline-block" />
              </button>
            </div>
          ))}
      </div>
      <UploadDocumentDialog
        isOpen={showDocumentsDialog.show}
        document={showDocumentsDialog.document}
        onDismiss={handleCloseDocumentsDialog}
        eventId={eventId}
        hash={showDocumentsDialog.hash}
      />

      <DeleteDocumentDialog
        isOpen={showDeleteDocumentDialog.show}
        onDismiss={handleCloseDeleteDocumentDialog}
        document={showDeleteDocumentDialog.document as Document}
        eventId={eventId}
      />
    </>
  );
}

function DeleteDocumentDialog(props: {
  document: Document;
  isOpen: boolean;
  onDismiss: () => void;
  eventId: string;
}) {
  const { t } = useTranslation(RESOURCES_NS);

  const { document, isOpen, onDismiss, eventId } = props;
  const fetcher = useFetcher();

  function handleSubmit() {
    fetcher.submit(
      { actionId: 'delete', documentId: document.id },
      {
        method: 'post',
        action: `organizer/document/${eventId}/manage`,
        encType: 'multipart/form-data'
      }
    );
  }

  useEffect(() => {
    if (fetcher.type === 'actionReload' && fetcher.data.ok) {
      return onDismiss();
    }
  });

  return (
    <div
      data-reach-dialog-overlay={true}
      className={clsx({
        'hidden ': !isOpen,
        'z-50 flex h-screen': isOpen
      })}
    >
      <div
        aria-modal={true}
        className={clsx(
          'w-11/12 dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg px-8 py-10 lg:px-24 lg:py-14 lg:max-w-screen-lg',
          {
            'hidden ': !isOpen,
            'm-auto': isOpen
          }
        )}
      >
        <H3>{t('Delete Document X', { name: document?.label })}</H3>
        <Paragraph>{t('Are you sure you want to delete document?')}</Paragraph>
        <Spacer size="2xs" />

        <ButtonGroup>
          <Button type="button" onClick={onDismiss}>
            {t('Ignore')}
          </Button>
          <Button
            variant="danger"
            size="medium"
            type="button"
            onClick={handleSubmit}
          >
            {t('Delete Document')}
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}
