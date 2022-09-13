import {
  useActionData,
  useFetcher,
  useLoaderData,
  useTransition
} from '@remix-run/react';
import type { ActionFunction, LinksFunction, LoaderFunction } from 'remix';
import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from 'remix';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import mapBoxGlCss from 'mapbox-gl/dist/mapbox-gl.css';

import type { UploadHandler } from '@remix-run/node';
import { unstable_composeUploadHandlers } from '@remix-run/node';

import { useTranslation } from 'react-i18next';

import {
  ArrowDownIcon,
  ArrowUpIcon,
  LocationMarkerIcon,
  PencilAltIcon,
  XCircleIcon
} from '@heroicons/react/outline';

import clsx from 'clsx';

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
import { findEvent, updateEvent } from '~/server/db/events.server';
import Main from '~/components/shared/Main';
import FormField from '~/components/shared/form/FormField';
import { H2, H3, H6, Paragraph } from '~/components/shared/typography';

import UploadForm from '~/components/shared/form/UploadForm';

import { uploadImageToCloudinary } from '~/server/storage/cloudinary.server';
import ComboBox from '~/components/shared/form/ComboBox';
import { parseLocation, processImgField } from '~/server/utils/misc';
import i18n from '~/server/i18n.server';
import { badRequest, timeOfDayToHoursMinutes } from '~/utils/misc';

import { findEventPerks } from '~/server/db/perks.server';
import { findEventRaces } from '~/server/db/races.server';
import Label from '~/components/shared/form/Label';
import WhenListEmpty from '~/components/shared/Empty';
import HourOfDay from '~/components/HourOfDay';
import { Spacer } from '~/components/shared/Spacer';

type ActionData = {
  hash: number;
  errors?: {
    name?: string;
  };
};

const RESOURCES_NS = 'create-event-form';

type LoaderData = {
  sports: Array<Sport>;
  mapToken: string;
  imageUploadEndpoint: string;
  imageDisplayEndpoint: string;
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
  const sports = await findSports();
  const eventId = params.eventId as string;
  const event = eventId ? await findEvent(eventId) : null;

  const {
    MAPBOX_TOKEN,
    IMAGE_UPLOAD_ENDPOINT,
    IMAGE_DISPLAY_ENDPOINT,
    CLOUDINARY_UPLOAD_PRESET
  } = Config();

  return json({
    mapToken: MAPBOX_TOKEN,
    imageUploadEndpoint: IMAGE_UPLOAD_ENDPOINT,
    imageDisplayEndpoint: IMAGE_DISPLAY_ENDPOINT,
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
  const t = await i18n.getFixedT(request, RESOURCES_NS);
  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, contentType, data, filename }) => {
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
    return badRequest({ error: t('Event not found') });
  }

  const form = await unstable_parseMultipartFormData(request, uploadHandler);
  const x = 1;

  const isUpdate = event.status !== 'auto';
  const date = form.get('date') as string;
  const image1 = form.get('/file/image/0') as string;
  const image2 = form.get('/file/image/1') as string;
  const image3 = form.get('/file/image/2') as string;
  const image4 = form.get('/file/image/3') as string;
  const image5 = form.get('/file/image/4') as string;
  const location = parseLocation(form.get('location') as string);

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

  await updateEvent(data, perks, newPerks);
  // eslint-disable-next-line no-console
  if (x === 1) {
    return badRequest({
      formError: 'Form not submitted correctly.'
    });
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
  const inputEl = useRef(null);

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

  useEffect(() => {
    setRaces(dbRaces);
  }, [dbRaces]);

  return (
    <Main>
      <div className="mb-12 lg:mb-20">
        <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
          <div>
            <H2>{t('Create Event')}</H2>
            <H3 variant="secondary" as="p">
              {t('Let Others know')}
            </H3>
          </div>
        </div>
      </div>

      <div className="mb-24">
        <UploadForm method="post" className="w-full">
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
          <div className="flex flex-row flex-wrap space-x-4">
            <FormField
              label={t('Sport')}
              id="event-sport"
              className="basis-1/3 lg:basis-1/4"
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
              className="basis-1/3 lg:basis-1/5"
              error={actionData?.errors?.name}
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
              className="basis-1/2 lg:basis-1/3"
              error={actionData?.errors?.location}
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
                    <LocationMarkerIcon className="h-6 w-6 m-0 inline-block" />
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

          <FormField label={t('Link to External Booking URL')}>
            <PickBookingSystem
              name="booking"
              t={t}
              useExternal={event?.useExternalBooking}
              url={event?.externalBookingUrl}
            />
          </FormField>
          <FormField label={t('Event Photos')} id="event-photos">
            <div className="w-full m-auto flex flex-row justify-begin gap-4 md:w-full md:grid-flow-col md:grid-rows-1 text-center">
              <UploadImage
                index={0}
                label={t('Hint For Picture 1')}
                defaultValue={event.image1}
                className="w-1/3"
              />
              <UploadImage
                index={1}
                label={t('Hint For Picture 2')}
                defaultValue={event.image2}
                className="w-1/3"
              />
              <UploadImage
                index={2}
                label={t('Hint For Picture 3')}
                defaultValue={event.image3}
                className="w-1/3"
              />
              <UploadImage
                index={3}
                label={t('Hint For Picture 4')}
                defaultValue={event.image4}
                className="w-1/3"
              />
              <UploadImage
                index={4}
                label={t('Hint For Picture 5')}
                defaultValue={event.image4}
                className="w-1/3"
              />
            </div>
          </FormField>

          <FormField label={t('Description')}>
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
            <div className="grid grid-rows-6 grid-flow-col gap-y-px mb-2">
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
                  className="ml-2 rounded-lg focus-ring text-sm md:text-sm bg-gray-100 text-black placeholder-gray-500 font-medium box-border w-41 dark:disabled:bg-gray-700 dark:text-white dark:bg-gray-800 disabled:text-gray-700 border-0 sm:col-span-4"
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

              <Button type="button" onClick={handleCreateRace}>
                {t('Create Distance')}
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
          </div>

          <FormField label={t('Directions')}>
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

          <ButtonLink
            className="mt-8"
            type="button"
            variant="secondary"
            to={'/organizer'}
          >
            {t('Cancel')}
          </ButtonLink>

          <Button className="mt-8 ml-8" type="submit" variant="primary">
            {event.status === 'auto' ? t('Create Button') : t('Save Button')}
          </Button>
        </UploadForm>
      </div>

      <RaceDialog
        isOpen={showRacesDialog.show}
        triggerModalClose={handleCloseRace}
        eventId={event.id}
        race={showRacesDialog.race}
        hash={showRacesDialog.hash}
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
  const [hour, minute] = timeOfDayToHoursMinutes(race?.startTime as number);

  const name = useRef<HTMLInputElement | null>(null);
  const distance = useRef<HTMLInputElement | null>(null);
  const elevationGain = useRef<HTMLInputElement | null>(null);
  const elevationLoss = useRef<HTMLInputElement | null>(null);
  const price = useRef<HTMLInputElement | null>(null);
  const priceEarlyBird = useRef<HTMLInputElement | null>(null);
  const validUntil = useRef<HTMLInputElement | null>(null);
  const raceDescription = useRef<HTMLTextAreaElement | null>(null);

  const close = useCallback(() => {
    setErrors({});
    triggerModalClose();
  }, [triggerModalClose]);

  function handleSubmit() {
    const payload = {
      raceId: race?.id? race.id : '',
      name: name.current?.value,
      distance: distance.current?.value,
      hour: 90,
      minute: 90,
      elevationGain: elevationGain.current?.value,
      elevationLoss: elevationLoss.current?.value,
      price: price.current?.value,
      priceEarlyBird: priceEarlyBird.current?.value,
      date: validUntil.current?.value,
      raceDescription: raceDescription.current?.value,
      hash,
      eventId
    };

    fetcher.submit(payload, {
      method: 'post',
      action: '/organizer/race/create'
    });
  }

  useEffect(() => {
    if (fetcher.type === 'actionReload' && fetcher.data.ok) {
      // redirect means success, since we redirect when race was created

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
          'w-5/6',
          'bg-white dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg font-extrabold',
          {
            'hidden ': !isOpen,
            'm-auto': isOpen
          }
        )}
      >
        <div className="relative" key={hash}>
          <fetcher.Form
            method="post"
            action="/organizer/race/create"
            className="px-6 py-2 flex flex-col lg:px-24 lg:py-14"
          >
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
              <HourOfDay hour={hour} minute={minute} />
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

            <div className="w-full md:w-112 flex flex-wrap gap-4 justify-begin">
              <Button
                className="mt-8"
                variant="secondary"
                type="button"
                onClick={close}
              >
                {t('Cancel')}
              </Button>

              <Button
                size="medium"
                className="mt-8"
                type="button"
                onClick={handleSubmit}
              >
                {race?.id ? t('Update Distance') : t('Create Distance')}
              </Button>
            </div>
          </fetcher.Form>
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

  function handleMoveUp(r: Race) {
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `/organizer/${r.id}/move-up`
      }
    );
  }

  function handleMoveDown(r: Race) {
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `/organizer/${r.id}/move-down`
      }
    );
  }

  function handleDeleteRace(r: Race) {
    setDeleteModalOpen({ show: true, race: r });
  }

  function handleDeleteRaceClose() {
    setDeleteModalOpen({ show: false });
  }

  function handleUpdateRace(r: Race) {
    setShowRacesDialog({ show: true, race: r, hash: Date.now() });
  }

  function handleCloseRace() {
    setShowRacesDialog({ show: false, hash: 0 });
  }

  return (
    <>
      {races
        .sort((a: Race, b: Race) => a.displayOrder - b.displayOrder)
        .map((r: Race, index) => (
          <div
            key={r.id}
            className="relative flex mb-4 justify-between items-center flex-col md:flex-row border-b p-4 last:border-none border-gray-300 dark:border-gray-300"
          >
            <div className={clsx('text-lg font-extrabold dark:text-white')}>
              {r.name}
            </div>
            <div>
              {index === 0 ? null : (
                <Button
                  className="ml-6"
                  type="button"
                  onClick={() => {
                    handleMoveUp(r);
                  }}
                >
                  <ArrowUpIcon className="md:h-6 w-6 m-0 inline-block" />
                </Button>
              )}
              {/*eslint-disable-next-line react/jsx-no-bind*/}
              {index === races.length - 1 ? null : (
                <Button
                  className="ml-6"
                  type="button"
                  onClick={() => {
                    handleMoveDown(r);
                  }}
                >
                  <ArrowDownIcon className="md:h-6 w-6 m-0 inline-block" />
                </Button>
              )}

              <Button
                className="ml-14"
                type="button"
                variant="danger"
                onClick={() => {
                  handleDeleteRace(r);
                }}
              >
                <XCircleIcon className="md:h-6 w-6 m-0 inline-block"></XCircleIcon>
              </Button>

              <Button
                className="ml-6"
                type="button"
                onClick={() => {
                  handleUpdateRace(r);
                }}
              >
                <PencilAltIcon className="md:h-6 w-6 m-0 inline-block" />
              </Button>
            </div>
          </div>
        ))}

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
      { actionId: 'delete', raceId: race?.id as string, eventId: eventId },
      {
        method: 'post',
        action: '/organizer/race/create'
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
          'w-11/12 dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg lg:px-24 lg:py-14 lg:max-w-screen-lg',
          {
            'hidden ': !isOpen,
            'm-auto': isOpen
          }
        )}
      >
        <H3>{t('Delete Race X', { name: race?.name })}</H3>
        <Paragraph>{t('Are you sure you want to delete race?')}</Paragraph>
        <Spacer size="2xs" />

        <div className="flex flex-wrap gap-4">
          <Button type="button" onClick={onDismiss}>
            {t('Ignore')}
          </Button>
          <Button
            variant="danger"
            size="medium"
            type="button"
            onClick={() => {
              handleSubmit();
            }}
          >
            {t('Delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
