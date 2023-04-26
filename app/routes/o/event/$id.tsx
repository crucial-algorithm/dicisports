import { MapPinIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Role, Status } from '@prisma/client';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import type {
  ActionFunction,
  LinksFunction,
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

import clsx from 'clsx';

import mapBoxGlCss from 'mapbox-gl/dist/mapbox-gl.css';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { z, ZodError } from 'zod';

import DocumentsList from '~/components/events/DocumentsList';

import RacesList from '~/components/events/RacesList';
import PickBookingSystem from '~/components/PickBookingSystem';
import Button, { ButtonLink } from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';
import WhenListEmpty from '~/components/shared/Empty';
import ComboBox from '~/components/shared/form/ComboBox';

import BasicDatePicker from '~/components/shared/form/DatePicker';
import FormField from '~/components/shared/form/FormField';

import InputError from '~/components/shared/form/InputError';
import Label from '~/components/shared/form/Label';
import TextField from '~/components/shared/form/TextField';

import UploadForm from '~/components/shared/form/UploadForm';
import UploadImage from '~/components/shared/form/UploadImage';
import Main from '~/components/shared/Main';
import { MapDialog } from '~/components/shared/Map';
import { H2, H6 } from '~/components/shared/typography';
import { requireUser } from '~/server/auth/session.server';
import Config from '~/server/config.server';
import {
  deleteEvent,
  findEvent,
  publishEvent,
  unpublishEvent,
  updateEvent
} from '~/server/db/events.server';

import { findEventPerks } from '~/server/db/perks.server';
import { findEventRaces } from '~/server/db/races.server';
import { findDifficulties, findSports } from '~/server/db/reference.server';
import i18n from '~/server/i18n.server';

import { uploadImageToCloudinary } from '~/server/storage/cloudinary.server';
import {
  NotFound,
  parseLocation,
  processImgField,
  Unauthorized
} from '~/server/utils/misc';
import { ConfirmationDialog } from '~/components/shared/Dialog';
import mapCss from '~/styles/map.css';
import organizerCss from '~/styles/organizer.css';

import type {
  CreateEventInput,
  DiciLocation,
  Difficulty,
  Document,
  Event,
  Language,
  Perk,
  Race,
  Sport,
  User
} from '~/types';
import { badRequest } from '~/utils/misc';

type ActionData = {
  hash: number;
  errors?: {
    name?: string;
    startAt?: string;
    location?: string;
    externalBookingUrl?: string;
    description?: string;
    directions?: string;
    submit?: string;
  };
};

const actionIds = {
  publish: 'publish',
  unpublish: 'unpublish',
  delete: 'delete'
};

const RESOURCES_NS = 'create-event-form';

type LoaderData = {
  sports: Array<Sport>;
  mapToken: string;
  imageUploadPreset: string;
  event: SportEvent | null;
  perks: Array<Perk>;
  races: Array<Race>;
  difficulties: Array<Difficulty>;
};

type SportEvent = Event & {
  documents?: Array<Document>;
};

export const handle = {
  i18n: ['common', 'create-event-form']
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);

  const sports = await findSports();
  const difficulties = await findDifficulties();
  const eventId = params.id as string;
  const event = eventId ? await findEvent(eventId) : null;

  const { MAPBOX_TOKEN, CLOUDINARY_UPLOAD_PRESET } = Config();

  if (!event || event.createdById !== user.id) {
    return redirect('/');
  }

  return json({
    mapToken: MAPBOX_TOKEN,
    imageUploadPreset: CLOUDINARY_UPLOAD_PRESET,
    event,
    sports: sports.map((sport) => {
      return { id: sport.id, name: sport.name };
    }),
    perks: await findEventPerks(eventId),
    races: await findEventRaces(eventId),
    difficulties: difficulties.map((d) => {
      return { id: d.id, name: d.name };
    })
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const user: User = await requireUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);
  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, data, filename }) => {
      if (!name.startsWith('/file/image') || !filename) {
        return undefined;
      }

      const uploadedImage = await uploadImageToCloudinary(
        data,
        params.id || null
      );

      return uploadedImage.public_id;
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  const event = params.id ? await findEvent(params.id) : null;

  if (!event) {
    throw NotFound(t('Event not found'));
  }
  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  let form: FormData;

  try {
    form = await unstable_parseMultipartFormData(request, uploadHandler);
  } catch (e) {
    // delete can't be processed with multipart form data 🤷‍♂️
    form = await request.formData();
  }

  const actionId = form.get('actionId') as string;

  if (actionId === actionIds.delete) {
    await deleteEvent(event.id as string);

    return redirect(`/o?message=${t('Event Deleted')}`);
  }

  const isUpdate = event.status !== 'auto';
  const date = form.get('event-date') as string;
  const image1 = form.get('/file/image/0') as string;
  const image2 = form.get('/file/image/1') as string;
  const image3 = form.get('/file/image/2') as string;
  const image4 = form.get('/file/image/3') as string;
  const image5 = form.get('/file/image/4') as string;
  const location = parseLocation(form.get('location') as string);
  const races: Race[] = (await findEventRaces(event.id)) || [];
  let eventStatus = event.status;

  if (eventStatus === Status.auto) {
    eventStatus = Status.draft;
  }

  const data: CreateEventInput = {
    id: params.id as string,
    name: form.get('event-name') as string,
    sportId: parseInt(form.get('sport') as string),
    difficultyId: parseInt(form.get('difficulty') as string),
    startAt: new Date(date), //TODO: hour
    lat: location.lat,
    lng: location.lng,
    location: location.address,
    useExternalBooking: form.get('booking') === 'external',
    externalBookingUrl: (form.get('booking-url') as string) || null,
    description: (form.get('event-description') as string) || null,
    directions: (form.get('get-there') as string) || null,
    image1: processImgField(image1, isUpdate),
    image2: processImgField(image2, isUpdate),
    image3: processImgField(image3, isUpdate),
    image4: processImgField(image4, isUpdate),
    image5: processImgField(image5, isUpdate),
    status: eventStatus
  };

  const perks: string[] = form.getAll('perks') as string[];
  const newPerks: string[] = form.getAll('new-perk-input') as string[];

  const EventSchema = {
    name: z
      .string({ required_error: t('Field Required') })
      .min(5, { message: t('Min 5 chars') }),
    sportId: z
      .number()
      .nonnegative({ message: t('Nonexistent Sport') })
      .lte(7, { message: t('Nonexistent Sport') }),
    startAt: z.date().min(new Date(), { message: t('Future Date') }),
    location: z.string({
      required_error: t('Field required'),
      invalid_type_error: t('Field required')
    }),
    useExternalBooking: z.boolean({
      invalid_type_error: t('Invalid Type')
    }),
    externalBookingUrl: z
      .string({ invalid_type_error: t('Invalid URL') })
      .url(),
    description: z
      .string({
        invalid_type_error: t('Invalid Type'),
        required_error: t('Field Required')
      })
      .min(1, { message: t('Min 1 chars') })
      .nullable(),
    races: z
      .string({ required_error: t('At least 1 race') })
      .array()
      .nonempty(t('At least 1 race'))
  };

  if (!data.useExternalBooking) {
    // @ts-ignore Don't like this... can we solve it with z.discriminatedUnion?
    EventSchema.externalBookingUrl = z
      .string({ invalid_type_error: t('Invalid URL') })
      .url()
      .nullable();
  }

  try {
    await updateEvent(data, perks, newPerks);

    if (actionId === actionIds.publish) {
      z.object(EventSchema).parse({ ...data, races: races.map((r) => r.id) });

      if (user.role === Role.ORGANIZER) {
        await publishEvent(event.id as string, data.name);
      } else {
        // User is not yet an organizer, so let's redirect him to create his organizer profile.
        // We may need to check if he has a profile already and if so, redirect him elsewhere.
        return redirect('/o/us');
      }
    }

    if (actionId === actionIds.unpublish) {
      await unpublishEvent(event.id as string);
    }

    const updatedEvent = await findEvent(event.id);

    if (
      updatedEvent?.status === 'published' ||
      updatedEvent?.status === 'unpublished'
    ) {
      return redirect(`/o/event/${event.id}/dashboard`);
    }

    return json({});
  } catch (e) {
    if (!(e instanceof ZodError)) {
      const tc = await i18n.getFixedT(request, 'common');

      return badRequest({
        errors: { submit: tc('500 error message') }
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
    races: dbRaces,
    difficulties
  } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);

  const [perks, setPerks] = useState<Array<StrippedPerk>>(dbPerks);
  const [races, setRaces] = useState<Array<Race>>(dbRaces);
  const [location, setLocation] = useState<DiciLocation | null>(
    event.location
      ? {
          coords: `${event.lat}, ${event.lng}`,
          shortAddress: event.location
        }
      : null
  );
  const [deleteEventModalOpen, setDeleteEventModalOpen] =
    useState<boolean>(false);
  const inputEl = useRef(null);
  const deleteEventForm = useRef<HTMLFormElement>(null);
  const isPublished = event.status === Status.published;

  // Hack: while remix doesn't handle dates properly
  hackyEventRevival(event);

  function handleShowMap() {
    setShowLocationPicker(true);
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

  function handleShowDeleteEventWarning() {
    setDeleteEventModalOpen(true);
  }

  function handleDiscardDeleteEvent() {
    setDeleteEventModalOpen(false);
  }

  function handleDeleteEvent() {
    if (!deleteEventForm.current) {
      return;
    }
    deleteEventForm.current.submit();
    setDeleteEventModalOpen(false);
  }

  useEffect(() => {
    setRaces(dbRaces);
  }, [dbRaces]);

  return (
    <Main>
      <div className="mb-24">
        <UploadForm method="post" className="w-full">
          <div className="mb-12 lg:mb-20">
            <div className="flex flex-row items-start justify-between items-center">
              <div>
                <H2>{t('Create Event')}</H2>
              </div>
              {event.status !== Status.auto &&
                (isPublished ? (
                  <div className="flex flex-col justify-center md:flex-row">
                    <ButtonLink
                      id="preview-button"
                      className="md:ml-4"
                      variant="secondary"
                      size="medium"
                      to={`/o/event/preview/${event.id}`}
                      target="_blank"
                    >
                      {t('Preview Button')}
                    </ButtonLink>
                  </div>
                ) : (
                  <div className="flex flex-col justify-center md:flex-row">
                    <Button
                      id="publish"
                      className="mb-4 md:mb-0"
                      name="actionId"
                      type="submit"
                      size="medium"
                      data-cy="publish"
                      value={actionIds.publish}
                    >
                      {t('Publish Button')}
                    </Button>
                    <ButtonLink
                      id="preview-button"
                      className="md:ml-4"
                      variant="secondary"
                      size="medium"
                      to={`/o/event/preview/${event.id}`}
                      target="_blank"
                    >
                      {t('Preview Button')}
                    </ButtonLink>
                  </div>
                ))}
            </div>
          </div>
          <FormField
            label={t('Name')}
            id="event-name"
            className="col-span-6 sm:col-span-4"
            error={actionData?.errors?.name}
          >
            <TextField
              name="event-name"
              id="event-name"
              placeholder={t('Event Name')}
              defaultValue={event.name || ''}
            />
          </FormField>
          <div className="flex flex-col flex-wrap md:flex-row">
            <FormField
              label={t('Sport')}
              id="event-sport"
              className="w-full md:basis-1/3 md:pr-4"
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
              className="w-full md:basis-1/3 md:pr-4"
              error={actionData?.errors?.startAt}
            >
              <BasicDatePicker
                label={t('Date')}
                name="event-date"
                date={event?.startAt}
                minDate={new Date()}
              />
            </FormField>

            <FormField
              label={t('Difficulty')}
              id="event-difficulty"
              className="w-full md:basis-1/3"
            >
              <ComboBox
                name="difficulty"
                id="event-difficulty"
                lang={language}
                placeholder=""
                defaultValue={
                  event.difficultyId ? event.difficultyId : undefined
                }
                options={difficulties
                  .sort((a: Difficulty, b: Difficulty) => a.id - b.id)
                  .map((d: Difficulty) => {
                    return { value: d.id, label: d.name };
                  })}
              />
            </FormField>
          </div>

          <FormField
            label={t('Location')}
            id="event-location"
            className="w-full"
            error={actionData?.errors?.location}
            onClick={handleShowMap}
          >
            <TextField
              name="discard-location"
              id="event-sport"
              defaultValue={location?.shortAddress}
              disabled={true}
              className="cursor-pointer"
              adornment={
                <Button
                  name="open-map"
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

          <FormField
            label={t('How Is Booking Going To Be Managed')}
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
            error={actionData?.errors?.description}
          >
            <div className="mt-1 relative rounded-md">
              <textarea
                name="event-description"
                className="input-text p-10"
                placeholder={t('Event description')}
                defaultValue={event.description || ''}
                rows={5}
                cols={50}
              />
            </div>
          </FormField>

          <FormField label={t('Perks')}>
            <div className="grid grid-rows-8 md:grid-rows-6 md:grid-flow-col gap-y-4 md:gap-y-2 mb-2">
              {perks
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((p: any, index: number) => (
                  <div key={p.id} className="flex items-center mb-1">
                    <input
                      data-cy={`perk-${index}`}
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
                      data-cy={`perk-label-${index}`}
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

              <ButtonLink
                className="hidden lg:flex"
                to="race/new"
              >
                {t('Create Distance')}
              </ButtonLink>

              <ButtonLink
                className="flex lg:hidden"
                to="race/new"
                size="small"
                data-cy="create-race"
              >
                <PlusIcon className="md:h-6 w-6 m-0 inline-block" />
              </ButtonLink>
            </Label>
            <div>
              <RacesList
                races={races}
                eventId={event.id}
              />
            </div>
            <WhenListEmpty list={races}>
              <H6 className="text-center p-12" variant="secondary" as="p">
                {t('No Races')}
              </H6>
            </WhenListEmpty>
            {actionData?.errors?.races ? (
              <InputError className="mt-8" id="error-message">
                {actionData?.errors?.races}
              </InputError>
            ) : null}
          </div>

          <FormField
            label={t('Directions')}
            error={actionData?.errors?.directions}
          >
            <div className="mt-2 relative rounded-md">
              <textarea
                name="get-there"
                className="input-text p-10"
                placeholder={t('How to get there')}
                defaultValue={event.directions || ''}
                rows={5}
                cols={50}
              />
            </div>
          </FormField>

          <div id="documents" className="mb-12">
            <Label
              htmlFor="documents"
              className={clsx(
                'mb-5 flex justify-between items-center flex-row'
              )}
            >
              {t('Documents')}

              <ButtonLink
                className="hidden lg:flex"
                type="button"
                to="doc/new"
              >
                {t('Upload Document')}
              </ButtonLink>
              <ButtonLink
                type="button"
                to="doc/new"
                size="small"
                className="flex lg:hidden"
                data-cy="create-document"
              >
                <PlusIcon className="md:h-6 w-6 m-0 inline-block"></PlusIcon>
              </ButtonLink>
            </Label>
            <div>
              <DocumentsList
                documents={event.documents}
                eventId={event.id}
              />
            </div>
            <WhenListEmpty list={event.documents}>
              <H6 className="text-center p-12" variant="secondary" as="p">
                {t('No Documents')}
              </H6>
            </WhenListEmpty>
          </div>

          <ButtonGroup className="mt-8">
            {event.status === 'published' && (
              <Button
                id="unpublish"
                className="mb-4 md:mb-0"
                name="actionId"
                type="submit"
                size="medium"
                variant="danger"
                data-cy="unpublish"
                value={actionIds.unpublish}
              >
                {t('Unpublish Button')}
              </Button>
            )}

            <Button
              name="delete-button"
              type="button"
              variant="danger"
              onClick={handleShowDeleteEventWarning}
            >
              {t('Delete Event')}
            </Button>

            <ButtonLink type="button" variant="secondary" to="/o">
              {t('Cancel')}
            </ButtonLink>

            <Button
              type="submit"
              variant="primary"
              name={event.status === 'auto' ? 'create-event' : 'update-event'}
            >
              {event.status === 'auto' ? t('Create Button') : t('Save Button')}
            </Button>


          </ButtonGroup>
          {actionData?.errors?.submit && (
            <InputError className="mt-8" id="500-error-message">
              {actionData?.errors?.submit}
            </InputError>
          )}
        </UploadForm>
      </div>

      <MapDialog
        token={mapToken}
        defaultValue={location}
        open={showLocationPicker}
        onClose={handleCloseMap}
      />

      <ConfirmationDialog
        isOpen={deleteEventModalOpen}
        title={t('Delete Event X', { name: event?.name })}
        question={t('Are you sure you want to delete event?')}
        primaryLabel={t('Delete Event')}
        primaryVariant="danger"
        secondaryLabel={t('Ignore')}
        onDismiss={handleDiscardDeleteEvent}
        onConfirm={handleDeleteEvent}
        className="cy-delete-dialog"
      />

      <Form
        id="profile-form"
        method="post"
        noValidate
        aria-describedby="general-error"
        className="hidden"
        ref={deleteEventForm}
      >
        <input type="hidden" name="actionId" value={actionIds.delete} />
      </Form>
    </Main>
  );
}
