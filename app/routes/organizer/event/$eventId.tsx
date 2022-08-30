import { useActionData, useFetcher, useLoaderData } from '@remix-run/react';
import type { ActionFunction, LinksFunction, LoaderFunction } from 'remix';
import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from 'remix';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import mapBoxGlCss from 'mapbox-gl/dist/mapbox-gl.css';

import type { UploadHandler } from '@remix-run/node';
import { unstable_composeUploadHandlers } from '@remix-run/node';

import { useTranslation } from 'react-i18next';

import { LocationMarkerIcon, PencilAltIcon } from '@heroicons/react/outline';

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
import Button from '~/components/shared/Button';

import { inputBaseClasses } from '~/components/shared/form/InputBase';
import Config from '~/server/config.server';
import { findSports } from '~/server/db/sports.server';
import { findEvent, updateEvent } from '~/server/db/events.server';
import Main from '~/components/shared/Main';
import FormField from '~/components/shared/form/FormField';
import { H2, H3, H6 } from '~/components/shared/typography';

import UploadForm from '~/components/shared/form/UploadForm';

import { uploadImageToCloudinary } from '~/server/storage/cloudinary.server';
import ComboBox from '~/components/shared/form/ComboBox';
import { parseLocation, processImgField } from '~/server/utils/misc';
import i18n from '~/server/i18n.server';
import { badRequest } from '~/utils/misc';

import { findEventPerks } from '~/server/db/perks.server';
import { findEventRaces } from '~/server/db/races.server';
import Label from '~/components/shared/form/Label';
import WhenListEmpty from '~/components/shared/Empty';

type ActionData = {
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
    races
  } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [showRacesDialog, setShowRacesDialog] = useState<{
    show: boolean;
    race?: Race;
  }>({ show: false });
  const [perks, setPerks] = useState<Array<StrippedPerk>>(dbPerks);
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
    setShowRacesDialog({ show: true });
  }
  function handleUpdateRace(race: Race) {
    setShowRacesDialog({ show: true, race });
  }

  function handleCloseRace() {
    setShowRacesDialog({ show: false });
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
            placeholder="Ex: Biclas e Borgas"
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
              // defaultValue={} TODO: Add default date
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

        <FormField label="">
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

        <div id="races" className="mb-2">
          <Label
            htmlFor="races"
            className={clsx('mb-5 flex justify-between items-center flex-row')}
          >
            {t('Distances')}

            <Button type="button" onClick={handleCreateRace}>
              {t('Create Distance')}
            </Button>
          </Label>
          <div>
            {races.map((r: any) => (
              <div
                key={r.id}
                className="relative flex mb-4 justify-between items-center flex-col md:flex-row border-b p-4 last:border-none border-gray-300 dark:border-gray-300"
              >
                <div className={clsx('text-lg font-extrabold dark:text-white')}>
                  {r.name}
                </div>
                {/* eslint-disable-next-line react/jsx-no-bind */}
                <Button className="ml-8" type="button" onClick={() => {
                  handleUpdateRace(r);
                }}>
                  <PencilAltIcon className="h-6 w-6 m-0 inline-block" />
                </Button>
              </div>
            ))}
          </div>
          <WhenListEmpty list={races}>
            <H6 className="text-center p-12" variant="secondary" as="p">
              {t('No Races')}
            </H6>
          </WhenListEmpty>
        </div>

        <Button className="mt-8" type="submit">
          {t('Create Button')}
        </Button>
      </UploadForm>

      <RaceDialog
        isOpen={showRacesDialog.show}
        triggerModalClose={handleCloseRace}
        eventId={event.id}
        race={showRacesDialog.race}
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
};

function clearForm(name: React.RefObject<HTMLInputElement> | null) {
  clearInputField(name);
}

function clearInputField(ref: React.RefObject<HTMLInputElement> | null) {
  if (ref && ref.current) {
    ref.current.value = '';
  }
}

function RaceDialog(props: {
  isOpen: boolean;
  triggerModalClose: () => void;
  eventId: string;
  race?: Race;
}) {
  const { t } = useTranslation('create-event-form');
  const { isOpen, triggerModalClose, eventId, race } = props;
  const fetcher = useFetcher();
  const [errors, setErrors] = useState<FormErrors>({});
  const name = useRef<HTMLInputElement | null>(null);
  const form = useRef<HTMLFormElement | null>(null);

  function close() {

    if (form.current) {
        form.current?.reset();
    }

    clearForm(name);
    setErrors({});
    triggerModalClose();
  }

  useEffect(() => {
    if (fetcher.type === 'actionRedirect') {
      // redirect means success, since we redirect when race was created

      return close();
    }

    if (fetcher.type === 'done' && fetcher.data?.errors) {
      return setErrors(fetcher.data.errors as FormErrors);
    }
  }, [fetcher, close]);
  console.log(errors);
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
        aria-label={t('Filters')}
        className={clsx(
          'w-5/6 max-w-lg',
          'bg-white dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg font-extrabold',
          {
            'hidden ': !isOpen,
            'm-auto': isOpen
          }
        )}
      >
        <div className="relative">
          <div className="px-6 py-2 flex flex-col items-center lg:px-24 lg:py-14">
            <fetcher.Form method="post" action="/organizer/race/create" ref={form}>
              <input type="hidden" name="event-id" value={eventId} />
              <input type="hidden" name="race-id" value={race?.id} />

              <FormField label={t('Race name')} error={errors?.name}>
                <TextField
                  id="race-name"
                  name="name"
                  placeholder={t('Race Name Placeholder')}
                  input={name}
                  defaultValue={race?.name}
                />
              </FormField>

              <div className="w-full m-auto flex flex-row justify-begin gap-4 md:w-full md:grid-flow-col md:grid-rows-1">
                <Button
                  className="mt-8"
                  type="button"
                  onClick={close}
                >
                  {t('Cancel')}
                </Button>

                <Button className="mt-8 ml-7" type="submit">
                  {race?.id? t('Update Distance') : t('Create Distance')}
                </Button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      </div>
    </div>
  );
}
