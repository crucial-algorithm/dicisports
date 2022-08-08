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

import type { Sport, Document, Event, DiciLocation } from '~/types';
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

const badRequest = (data: ActionData) => json(data, { status: 400 });

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

  const form = await unstable_parseMultipartFormData(request, uploadHandler);
  const x = 1;

  await updateEvent({ id: params.eventId as string, name: form.get('name') as string });
  // eslint-disable-next-line no-console
  console.log('form = ', form.get('name'));
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
  const { t } = useTranslation('create-event-form');
  const { sports, mapToken, imageDisplayEndpoint, event } =
    useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [, setLocation] = useState<string | undefined | null>(event?.location);
  const loadedImages = mapDbImages(event?.documents, imageDisplayEndpoint);

  // Hack: while remix doesn't handle dates properly
  hackyEventRevival(event);

  function handleShowMap() {
    setShowLocationPicker(true);
  }

  function handleCloseMap() {
    setShowLocationPicker(false);
  }

  function handlePickedLocation(location: DiciLocation | null) {
    setLocation(location?.shortAddress || '');
  }

  return (
    <Main>
      <div className="mb-64 mt-24 pt-6">
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
      </div>

      <div className="mb-24 lg:mb-0">
        <UploadForm method="post" className="w-full">
          <FormField
            label={t('Name')}
            id="event-name"
            className="w-full max-w-xl"
            error={actionData?.errors?.name}
          >
            <TextField
              name="name"
              id="event-name"
              defaultValue={event.name || ''}
            />
          </FormField>
          <Button className="mt-8" type="submit" form="profile-form">
            {t('Create Button')}
          </Button>
        </UploadForm>
      </div>

      <MapDialog
        token={mapToken}
        defaultValue={null}
        open={showLocationPicker}
        setClosed={handleCloseMap}
        onPickedLocation={handlePickedLocation}
      />
    </Main>
  );
}
