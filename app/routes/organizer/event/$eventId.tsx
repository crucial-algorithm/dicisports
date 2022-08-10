import { Form, useActionData, useLoaderData } from '@remix-run/react';
import type { ActionFunction, LinksFunction, LoaderFunction } from 'remix';
import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from 'remix';

import { useState } from 'react';

import mapBoxGlCss from 'mapbox-gl/dist/mapbox-gl.css';

import type { UploadHandler } from '@remix-run/node';

import { useTranslation } from 'react-i18next';

import { LocationMarkerIcon } from '@heroicons/react/outline';

import { parseMultipartFormData } from '@remix-run/server-runtime/dist/formData';

import BasicDatePicker from '~/components/shared/form/DatePicker';
import PickBookingSystem from '~/components/PickBookingSystem';
import { MapDialog } from '~/components/shared/Map';

import mapCss from '~/styles/map.css';
import organizerCss from '~/styles/organizer.css';
import UploadImage from '~/components/shared/form/UploadImage';

import type {
  Sport,
  Document,
  Event,
  DiciLocation,
  CreateEventInput
} from '~/types';
import Header from '~/components/shared/Header';
import TextField from '~/components/shared/form/TextField';
import Button from '~/components/shared/Button';

import { inputBaseClasses } from '~/components/shared/form/InputBase';
import Config from '~/server/config.server';
import { findSports } from '~/server/db/sports.server';
import { findEvent, updateEvent } from '~/server/db/events.server';
import Main from '~/components/shared/Main';
import I18nText from '~/components/I18nText';
import FormField from '~/components/shared/form/FormField';
import { H2, H3 } from '~/components/shared/typography';
import UploadForm from '~/components/shared/form/UploadForm';
import { unstable_composeUploadHandlers } from '@remix-run/node';
import { uploadImageToCloudinary } from '~/server/storage/cloudinary.server';
import ComboBox from '~/components/shared/form/ComboBox';
import { Language } from '~/types';
import { parseLocation, processImgField } from '~/server/utils/misc';
import i18n from '~/server/i18n.server';
import { badRequest } from '~/utils/misc';

type ActionData = {
  formError?: string;
  fieldErrors?: {
    name: string | undefined;
    content: string | undefined;
  };
  fields?: {
    name: string;
    content: string;
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
};

type SportEvent = Event & {
  documents?: Array<Document>;
};

export const handle = {
  i18n: ['common', 'create-event-form']
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const sports = await findSports();
  const event = params.eventId ? await findEvent(params.eventId) : null;

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
    })
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
  await updateEvent(data);
  // eslint-disable-next-line no-consoleTex
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

type Image = {
  name: string;
  file: File;
  value: string;
  timestamp: number;
  signature: string;
  apiKey: string;
};

const encTypeUpload = 'multipart/form-data';
const mapDbImages = (
  images: Array<Document> | undefined,
  url: string | undefined
): Array<string> => {
  if (!images || images.length === 0) {
    return [];
  }
  return images
    .sort((a, b) => a.position - b.position)
    .map((img) => `${url}/${img.key}`);
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
  const { t, i18n } = useTranslation('create-event-form');
  const language = i18n.language as Language;
  const { sports, mapToken, imageDisplayEndpoint, event } =
    useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const loadedImages = mapDbImages(event?.documents, imageDisplayEndpoint);
  const [location, setLocation] = useState<DiciLocation | null>(
    event.address
      ? {
          coords: event.location,
          shortAddress: event.address
        }
      : null
  );

  // Hack: while remix doesn't handle dates properly
  hackyEventRevival(event);

  function handleShowMap() {
    setShowLocationPicker(true);
  }

  function handleCloseMap(location: DiciLocation | null) {
    setShowLocationPicker(false);
    setLocation(location);
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
        {/*TODO: add size to textarea*/}
        <FormField label="">
          <div className="mt-1 relative rounded-md shadow-sm">
            <textarea name="description" className={inputBaseClasses('p-10')} placeholder={t('Event description')} defaultValue={event.eventDescription || ''}/>
          </div>
        </FormField>

        <Button className="mt-8" type="submit" form="profile-form">
          {t('Create Button')}
        </Button>
      </UploadForm>

      <MapDialog
        token={mapToken}
        defaultValue={location}
        open={showLocationPicker}
        onClose={handleCloseMap}
      />
    </Main>
  );
}
