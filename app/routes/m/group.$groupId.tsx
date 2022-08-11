import type { ActionFunction, LinksFunction, LoaderFunction } from 'remix';

import { json, redirect, unstable_createMemoryUploadHandler, unstable_parseMultipartFormData } from 'remix';

import { useActionData } from '@remix-run/react';

import { useTranslation } from 'react-i18next';

import { Form, useLoaderData } from '@remix-run/react';

import { useState } from 'react';

import type { UploadHandler } from '@remix-run/node';

import { unstable_composeUploadHandlers } from '@remix-run/node';

import { z, ZodError } from 'zod';

import { Dialog } from '@reach/dialog';

import Main from '~/components/shared/Main';
import { H2, H3, Paragraph } from '~/components/shared/typography';


import { requireUser } from '~/server/auth/session.server';
import { findSports } from '~/server/db/sports.server';
import { deleteGroup, findGroup, updateGroup } from '~/server/db/groups.server';


import Button from '~/components/shared/Button';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import type {
  DiciLocation,
  Group,
  GroupSpirit,
  GroupType,
  Sport,
  Language
} from '~/types';
import ComboBox from '~/components/shared/form/ComboBox';
import { findGroupTypes } from '~/server/db/groupTypes.server';
import HourOfDay from '~/components/HourOfDay';
import { findGroupsSpirit } from '~/server/db/groupsSpirit.server';


import { MapDialog } from '~/components/shared/Map';
import Config from '~/server/config.server';
import UploadImage from '~/components/shared/form/UploadImage';


import {
  badRequest,
  hoursMinutesToTimeOfDay,
  PeekDayOfWeek,
  timeOfDayToHoursMinutes
} from '~/utils/misc';
import UploadForm from '~/components/shared/form/UploadForm';
import mapCss from '~/styles/map.css';
import vendorsCss from '~/styles/vendors.css';


import i18n from '~/server/i18n.server';
import InputError from '~/components/shared/form/InputError';
import { Spacer } from '~/components/shared/Spacer';

import { uploadImageToCloudinary } from '~/server/storage/cloudinary.server';
import { processImgField } from '~/server/utils/misc';


const RESOURCES_NS = 'groups-form';

type LoaderData = {
  sports: Array<Sport>
  groupTypes: Array<GroupType>
  groupsSpirit: Array<GroupSpirit>
  group: Group

  mapToken: string
  imageUploadEndpoint: string
  imageUploadPreset: string
}

const actionIds = {
  delete: 'delete'
};

export const links: LinksFunction = () => {
  return [
    {
      rel: 'stylesheet',
      href: mapCss
    },
    {
      rel: 'stylesheet',
      href: vendorsCss
    }
  ];
};

export const handle = {
  i18n: RESOURCES_NS
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const { MAPBOX_TOKEN, IMAGE_UPLOAD_ENDPOINT, CLOUDINARY_UPLOAD_PRESET } = Config();

  const group = params.groupId ? await findGroup(params.groupId) : null;

  if (!group || group.createdById !== user.id) {
    return redirect('/m/groups');
  }

  return json(
    {
      sports: await findSports(),
      groupTypes: await findGroupTypes(),
      groupsSpirit: await findGroupsSpirit(),
      group,
      groupId: params.groupId,

      mapToken: MAPBOX_TOKEN,
      imageUploadEndpoint: IMAGE_UPLOAD_ENDPOINT,
      imageUploadPreset: CLOUDINARY_UPLOAD_PRESET
    }
  );
};

type ActionData = {
  error?: string
  errors?: {
    name?: string
    location?: string
    near?: string
  }
}

function parseLocation(location: string) {
  const [coords, address] = location.split('|');
  const [lat, lng] = coords.split(',');

  return {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    address
  };
}

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, RESOURCES_NS);
  const user = await requireUser(request);
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
  const action = form.get('actionId') as string;

  // Check if user should be able to manipulate this group
  const group = params.groupId ? await findGroup(params.groupId) : null;

  if (!group) {return badRequest({ error: t('Group not found') });}
  if (group.createdById !== user.id)
    {return badRequest({ error: t('Not authorized') });}

  // from here on, the user is capable of doing whatever to the group
  if (action === actionIds.delete) {
    await deleteGroup(group.id);
    return redirect(
      `/m/groups?message=${t('Group deleted successfully')}`
    );
  }
  const isUpdate = group.status !== 'auto';
  const image1 = form.get('/file/image/0') as string;
  const image2 = form.get('/file/image/1') as string;
  const image3 = form.get('/file/image/2') as string;
  const location = parseLocation(form.get('location') as string);
  const data = {
    id: form.get('id') as string,
    name: form.get('name') as string,
    sportId: parseInt(form.get('sport') as string),
    groupTypeId: parseInt(form.get('type') as string),
    groupSpiritId: parseInt(form.get('spirit') as string),
    location: location.address,
    lat: location.lat,
    lng: location.lng,
    near: form.get('near') as string,
    dayOfWeek: parseInt(form.get('dayOfWeek') as string),
    timeOfDay: hoursMinutesToTimeOfDay(
      parseInt(form.get('hour') as string, 10),
      parseInt(form.get('minute') as string, 10)
    ),
    whatsapp: form.get('whatsapp') as string,
    image1: processImgField(image1, isUpdate),
    image2: processImgField(image2, isUpdate),
    image3: processImgField(image3, isUpdate)
  };
  const required = { invalid_type_error: t('Field required') };
  const str5CharsOrMore = z
    .string(required)
    .min(5, { message: t('Name 5 chars or more') });
  const GroupSchema = z.object({
    name: str5CharsOrMore,
    location: z.string(required),
    near: str5CharsOrMore
  });

  try {
    GroupSchema.parse(data);
    await updateGroup(data);
    return redirect(
      `/m/groups?message=${t(
        isUpdate ? 'Group updated successfully' : 'Group created successfully'
      )}`
    );
  } catch (excp) {
    if (!(excp instanceof ZodError)) {
      console.error(excp);
      return badRequest({
        error: t('We dont know what happened')
      });
    }
    const errors: { [key: string]: string | undefined } = {};

    for (const error of (excp as ZodError).errors) {
      errors[error.path[0]] = error.message;
    }

    return badRequest({ error: undefined, errors });
  }
};

export default function GroupRoute() {
  const { t, i18n } = useTranslation(RESOURCES_NS);
  const language = i18n.language as Language;
  const loadedData = useLoaderData<LoaderData>();
  const {
    mapToken,
    sports,
    groupTypes,
    groupsSpirit,
    group
  } = loadedData;
  const isUpdate = group.status !== 'auto';
  // using parse float for 0 min's to work
  const [hour, minute] = timeOfDayToHoursMinutes(group.timeOfDay);
  const actionData = useActionData<ActionData>();
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);

  // open map stuff
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false);
  const [location, setLocation] = useState<DiciLocation | null>(
    group.location
      ? {
          coords: `${group.lat},${group.lng}`,
          shortAddress: group.location
        }
      : null
  );

  function handleShowMap() {
    setShowLocationPicker(true);
  }

  function handleCloseMap(location: DiciLocation | null) {
    setShowLocationPicker(false);
    setLocation(location);
  }

  function handleShowDeleteWarning() {
    setDeleteModalOpen(true);
  }

  function handleDiscardDelete() {
    setDeleteModalOpen(false);
  }

  return (
    <Main>
      <div className="mb-64 mt-24 pt-6">
        <div className="mb-12 lg:mb-20">
          <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
            <div>
              <H2>{t('Ride Together')}</H2>
              <H3 variant="secondary" as="p">
                {t('Let Others know')}
              </H3>
            </div>
          </div>
        </div>

        <div className="mb-24 lg:mb-0">
          <UploadForm
            method="post"
            className="w-full"
          >
            <input type="hidden" name="id" value={group?.id || ''} />
            <FormField
              label={t('Group Name')}
              id="group-name"
              className="w-full max-w-xl"
              error={actionData?.errors?.name}
            >
              <TextField
                name="name"
                id="group-sport"
                defaultValue={group.name || ''}
              />
            </FormField>
            <FormField
              label={t('Group Sport')}
              id="group-sport"
              className="w-64"
            >
              <ComboBox
                name="sport"
                id="group-sport"
                lang={language}
                placeholder=""
                defaultValue={group.sport ? group.sport.id : undefined}
                options={sports.map((s: Sport) => {
                  return { value: s.id, label: s.name };
                })}
              />
            </FormField>
            <FormField label={t('Group Type')} id="group-type" className="w-64">
              <ComboBox
                name="type"
                id="group-type"
                lang={language}
                placeholder=""
                defaultValue={group.groupType ? group.groupType.id : undefined}
                options={groupTypes.map((g: GroupType) => {
                  return { value: g.id, label: g.name };
                })}
              />
            </FormField>
            <FormField
              label={t('Group Spirit')}
              id="group-spirit"
              className="w-64"
            >
              <ComboBox
                name="spirit"
                id="group-spirit"
                placeholder=""
                lang={language}
                defaultValue={
                  group.groupSpirit ? group.groupSpirit.id : undefined
                }
                options={groupsSpirit.map((g: GroupSpirit) => {
                  return { value: g.id, label: g.name };
                })}
              />
            </FormField>
            <FormField
              label={t('Group Location')}
              id="group-location"
              className="w-full max-w-xl"
              error={actionData?.errors?.location}
            >
              <TextField
                name="discard-location"
                id="group-sport"
                defaultValue={location?.shortAddress}
                disabled={true}
                adornment={
                  <Button
                    className="mr-2"
                    variant="adornment"
                    type="button"
                    onClick={handleShowMap}
                  >
                    {t('Map')}
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
              label={t('Group Location Helper')}
              id="group-location-helper"
              className="w-full max-w-xl"
              error={actionData?.errors?.near}
            >
              <TextField
                name="near"
                id="group-location-helper"
                placeholder={t('Group Location Helper Placeholder')}
                defaultValue={group.near || ''}
              />
            </FormField>
            <FormField
              label={t('Day Of Week')}
              id="group-day-of-week"
              className="w-64"
            >
              <PeekDayOfWeek
                name="dayOfWeek"
                id="group-day-of-week"
                defaultValue={group.dayOfWeek}
              />
            </FormField>
            <FormField
              label={t('Time Of Day')}
              id="group-time-of-day"
              className="w-80 md:w-48"
            >
              <HourOfDay hour={hour} minute={minute} />
            </FormField>
            <FormField label={t('WhatsApp Group')}>
              <TextField
                name="whatsapp"
                defaultValue={group.whatsapp || ''}
                className="w-full max-w-xl"
              />
              <Paragraph className="text-xs mt-1">
                1. {t('WhatsApp Create Group')}
              </Paragraph>
              <Paragraph className="text-xs mt-1">
                2. {t('WhatsApp Get Link')}
              </Paragraph>
            </FormField>
            <FormField label={t('Group Photos')} id="group-photos">
              <div className="w-full m-auto flex flex-row justify-begin gap-4 md:w-full md:grid-flow-col md:grid-rows-1 text-center">
                <UploadImage
                  index={0}
                  label={t('Hint For Picture 1')}
                  defaultValue={group.image1}
                  className="w-1/3"
                />
                <UploadImage
                  index={1}
                  label={t('Hint For Picture 2')}
                  defaultValue={group.image2}
                  className="w-1/3"
                />
                <UploadImage
                  index={2}
                  label={t('Hint For Picture 3')}
                  defaultValue={group.image3}
                  className="w-1/3"
                />
              </div>
            </FormField>
            <Button
              className="mt-8"
              type="submit"
              form="profile-form"
            >
              {isUpdate
                ? t('Update Group')
                : t('Create Group')}
            </Button>
            <InputError id="global-error" className="mt-4">
              {actionData?.error}
            </InputError>
          </UploadForm>
          {isUpdate ? (
            <Form
              method="post"
              className="mt-24 border-t border-gray-300 dark:border-gray-300 pt-6"
            >
              <input type="hidden" name="actionId" value={actionIds.delete} />
              <Button
                variant="danger"
                type="button"
                onClick={handleShowDeleteWarning}
              >
                {t('Delete Group')}
              </Button>
            </Form>
          ) : null}
        </div>
      </div>

      <MapDialog
        token={mapToken}
        defaultValue={location}
        open={showLocationPicker}
        onClose={handleCloseMap}
      />

      <Dialog
        onDismiss={handleDiscardDelete}
        isOpen={deleteModalOpen}
        aria-label="Delete your account"
        className="w-11/12 dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg lg:px-24 lg:py-14 lg:max-w-screen-lg"
      >
        <H3>{t('Delete Group X', { name: group?.name })}</H3>
        <Paragraph>{t('Are you sure you want to delete group?')}</Paragraph>
        <Spacer size="2xs" />
        <Form
          id="profile-form"
          method="post"
          noValidate
          aria-describedby="general-error"
        >
          <input type="hidden" name="actionId" value={actionIds.delete} />
          <div className="flex flex-wrap gap-4">
            <Button type="button" onClick={handleDiscardDelete}>
              {t("No, I don't want to delete")}
            </Button>
            <Button variant="danger" size="medium" type="submit">
              {t('Delete Group')}
            </Button>
          </div>
        </Form>
      </Dialog>
    </Main>
  );
}
