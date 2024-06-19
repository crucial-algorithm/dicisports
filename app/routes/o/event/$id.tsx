import { PlusIcon } from '@heroicons/react/24/outline';
import { Role, Status } from '@prisma/client';
import {
  Form,
  Link,
  useActionData,
  useFetcher,
  useLoaderData
} from '@remix-run/react';
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
import type { Perk, Race, Document } from '@prisma/client';

import clsx from 'clsx';
import { Toast } from 'primereact/toast';
import type { FileUploadHandlerEvent } from 'primereact/fileupload';

import mapBoxGlCss from 'mapbox-gl/dist/mapbox-gl.css?url';

import type { ChangeEvent } from 'react';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { z, ZodError } from 'zod';
import { XMarkIcon } from '@heroicons/react/24/solid';

import DifficultiesDropdown from '~/components/DifficultiesDropdown';

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
import LocationPicker from '~/components/shared/form/LocationPicker';
import TextArea from '~/components/shared/form/TextArea';
import TextField from '~/components/shared/form/TextField';
import UploadImage from '~/components/shared/form/UploadImage';
import Main from '~/components/shared/Main';
import { H2, H6 } from '~/components/shared/typography';
import { requireUser } from '~/server/auth/session.server';
import Config from '~/server/config.server';
import type { EventWithRacesDifficultiesAndDocuments } from '~/server/db/events.server';
import {
  deleteEvent,
  findEventWithRacesAndDocuments,
  publishEvent,
  unpublishEvent,
  updateEvent,
  findEventOrganizer
} from '~/server/db/events.server';

import { findEventPerks } from '~/server/db/perks.server';
import { findEventRaces } from '~/server/db/races.server';
import { findDifficulties, findSports } from '~/server/db/reference.server';
import i18n from '~/server/i18n.server';
import UploadForm from '~/components/shared/form/UploadForm';

import { uploadImageToCloudinary } from '~/server/storage/cloudinary.server';
import {
  InternalServerError,
  NotFound,
  parseLocation,
  processImgField,
  Unauthorized
} from '~/server/utils/misc';
import { ConfirmationDialog } from '~/components/shared/Dialog';
import mapCss from '~/styles/map.css?url';
import organizerCss from '~/styles/organizer.css?url';

import type {
  CreateEventInput,
  DiciLocation,
  Difficulty,
  Language,
  ResponseFeedback,
  Sport,
  User
} from '~/types';
import { badRequest, fetcherType, formHelperReadDate } from '~/utils/misc';
import UploadFile from '~/components/UploadFile';
import { findConfirmedBookings } from '~/server/db/booking.server';

type ActionData = {
  hash: number;
  feedback?: ResponseFeedback;
  errors?: {
    name?: string;
    startAt?: string;
    location?: string;
    externalBookingUrl?: string;
    description?: string;
    externalWebsite?: string;
    directions?: string;
    submit?: string;
    races?: string;
    regulation?: string;
    bibStartingNumber?: string;
    coordinates?: string;
    placeName?: string;
    bookingStopsAt?: string;
  };
  ok?: boolean;
};

const actionIds = {
  publish: 'publish',
  unpublish: 'unpublish',
  deleteEvent: 'delete-event',
  deleteRegulation: 'delete-regulation',
  uploadRegulation: 'upload-regulation',
  addNewRace: 'add-new-race',
  addNewDocument: 'add-new-doc'
};

const RESOURCES_NS = 'create-event-form';

type LoaderData = {
  sports: Array<Sport>;
  mapToken: string;
  imageUploadPreset: string;
  event: EventWithRacesDifficultiesAndDocuments;
  perks: Array<Perk>;
  races: Array<Race>;
  difficulties: Array<Difficulty>;
  regulation: Document | null;
  hasRegistrations: boolean;
};

export const handle = {
  i18n: ['common', RESOURCES_NS]
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);

  const sports = await findSports();
  const difficulties = await findDifficulties();
  const eventId = params.id as string;
  const event = eventId ? await findEventWithRacesAndDocuments(eventId) : null;

  const { MAPBOX_TOKEN, CLOUDINARY_UPLOAD_PRESET } = Config();

  if (!event) {
    console.log('Organizer accessing unexisting event');
    return redirect('/');
  }

  if (event.createdById !== user.id && user.role !== Role.ADMIN) {
    console.log("Organizer accessing event that doesn't belong to him");
    return redirect('/');
  }

  const confirmedBookings = await findConfirmedBookings(eventId);

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
      return { id: d.id, name: d.name, description: d.description };
    }),
    hasRegistrations: confirmedBookings && confirmedBookings?.length > 0
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

      const event = await findEventWithRacesAndDocuments(String(params.id));

      if (!event) {
        return ''; // should never happen
      }

      const uploadedImage = await uploadImageToCloudinary(
        data,
        `events/${event.createdAt.getFullYear()}${String(
          event.createdAt.getMonth() + 1
        ).padStart(2, '0')}/${params.id}`
      );

      return uploadedImage.public_id;
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  const event = params.id
    ? await findEventWithRacesAndDocuments(params.id)
    : null;

  if (!event) {
    throw NotFound(t('Event not found'));
  }
  if (event.createdById !== user.id && user.role !== Role.ADMIN) {
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

  if (actionId === actionIds.deleteEvent) {
    await deleteEvent(event.id as string);

    return redirect(`/o?message=${t('Event Deleted')}`);
  }

  const isUpdate = event.status !== 'auto';
  const date = formHelperReadDate(form, 'event-date');
  const image1 = form.get('/file/image/0') as string;
  const image2 = form.get('/file/image/1') as string;
  const image3 = form.get('/file/image/2') as string;
  const image4 = form.get('/file/image/3') as string;
  const image5 = form.get('/file/image/4') as string;
  const location = parseLocation(form.get('location') as string);
  const bookingStopsAt = formHelperReadDate(form, 'booking-stops-at');
  const races: Race[] = (await findEventRaces(event.id)) || [];
  let eventStatus = event.status;

  let path = event.regulationPath;
  let regulationFileName = event.regulationFileName;
  const inlineRegulation = (form.get('regulation') as string) || null;

  // we need to make sure that we don't have both uploaded
  // when we upload a PDF regulation, inline regulation is set to null
  if (inlineRegulation !== null) {
    path = null;
    regulationFileName = null;
  }

  if (eventStatus === Status.auto) {
    eventStatus = Status.draft;
  }

  // bib start number, and registration system in general, can't be
  // changed if the event already has registration recorded
  const confirmedBookings = await findConfirmedBookings(event.id);
  const hasRegistrations: boolean =
    !!confirmedBookings && confirmedBookings?.length > 0;
  const useExternalBooking = hasRegistrations
    ? event.useExternalBooking
    : form.get('booking') === 'external';
  const bibNumberField = form.get('bib-number');
  const bibStartingNumber = useExternalBooking
    ? 1
    : hasRegistrations
    ? event.bibStartingNumber
    : Number(bibNumberField || 1);

  if (bookingStopsAt) {
    bookingStopsAt.setUTCHours(23);
    bookingStopsAt.setUTCMinutes(59);
    bookingStopsAt.setUTCSeconds(59);
  }

  const data: CreateEventInput = {
    id: params.id as string,
    name: form.get('event-name') as string,
    sportId: parseInt(form.get('sport') as string),
    difficultyId: parseInt(form.get('difficulty') as string),
    startAt: date,
    lat: location.lat,
    lng: location.lng,
    // @ts-ignore TODO: find out the proper type declaration for json inputs in prisma
    location: location.location,
    placeName: (form.get('place4location') as string) || null,
    useExternalBooking,
    bookingStopsAt,
    externalBookingUrl: (form.get('booking-url') as string) || null,
    description: (form.get('event-description') as string) || null,
    directions: (form.get('get-there') as string) || null,
    bibStartingNumber,
    image1: processImgField(image1, isUpdate),
    image2: processImgField(image2, isUpdate),
    image3: processImgField(image3, isUpdate),
    image4: processImgField(image4, isUpdate),
    image5: processImgField(image5, isUpdate),
    externalWebsite: (form.get('external-website') as string) || null,
    regulationPath: path,
    regulationContent: inlineRegulation || event.regulationContent,
    regulationFileName,
    status: eventStatus
  };

  const perks: string[] = form.getAll('perks') as string[];
  const newPerks: string[] = form.getAll('new-perk') as string[];

  const SaveEventSchema = z
    .object({
      placeName: z.string().nullable()
    })
    .refine(
      () =>
        (data.location && data.lng && data.lat) ||
        (!data.location && !data.lng && !data.lat),
      {
        message: t('Where Is Location X', { location: data.location }),
        path: ['coordinates']
      }
    );

  const EventSchema = z
    .object({
      name: z
        .string({ required_error: t('Field Required') })
        .min(5, { message: t('Min 5 chars') }),
      sportId: z
        .number()
        .nonnegative({ message: t('Nonexistent Sport') })
        .lte(7, { message: t('Nonexistent Sport') }),
      startAt: z
        .date({
          required_error: t('Field Required'),
          invalid_type_error: t('Invalid Date Format')
        })
        .min(new Date(), { message: t('Future Date') }),
      placeName: z.string({
        required_error: t('Field required'),
        invalid_type_error: t('Field required')
      }),
      useExternalBooking: z.boolean({
        invalid_type_error: t('Invalid Type')
      }),
      description: z
        .string({
          invalid_type_error: t('Invalid Type'),
          required_error: t('Field Required')
        })
        .min(1, { message: t('Min 1 chars') })
        .nullable(),
      bibStartingNumber: z
        .number()
        .int({ message: t('Must be int') })
        .nonnegative({ message: t('Positive number') }),
      races: z
        .string({ required_error: t('At least 1 race') })
        .array()
        .nonempty(t('At least 1 race')),
      regulationPath: z.string().nullable(),
      regulationContent: z.string().nullable(),
      externalWebsite: z
        .string()
        .url(t('External Website Url Error'))
        .nullable()
    })
    .and(
      z.object(
        data.useExternalBooking
          ? {
              externalBookingUrl: z
                .string({ invalid_type_error: t('Invalid URL') })
                .url({ message: t('Invalid URL') })
            }
          : {}
      )
    )
    .and(
      z.object(
        data.useExternalBooking
          ? {}
          : {
              bookingStopsAt: z
                .date({
                  required_error: t('Field required'),
                  invalid_type_error: t('Invalid Date Format')
                })
                .max(
                  data.startAt ? new Date(data.startAt) : new Date('2100-12-31'),
                  t('Date Limit = to event start date')
                )
            }
      )
    )
    .refine(
      (s) =>
        (s.regulationPath === null &&
          s.regulationContent &&
          s?.regulationContent?.length > 1) ||
        (s.regulationPath &&
          s?.regulationPath?.length > 1 &&
          s.regulationContent === null),
      {
        message: t('Add Regulation'),
        path: ['regulation']
      }
    ) // This shouldn't happen, but just in case it does, validation is improved
    .refine(() => data.lng && data.lat, {
      message: t('Where Is Location X', { location: data.placeName }),
      path: ['coordinates']
    });

  let feedback: ResponseFeedback | undefined;

  try {
    if (actionId === actionIds.addNewRace) {
      // Only save event changes when it is not published, otherwise just redirect
      if (eventStatus !== Status.published) {
        await updateEvent(data, perks, newPerks);
      }

      return redirect('race/new');
    }

    if (actionId === actionIds.addNewDocument) {
      if (eventStatus !== Status.published) {
        await updateEvent(data, perks, newPerks);
      }

      return redirect('doc/new');
    }

    if (eventStatus === 'published') {
      EventSchema.parse({ ...data, races: races.map((r) => r.id) });
    } else {
      SaveEventSchema.parse({ placeName: data.placeName });
    }

    await updateEvent(data, perks, newPerks, hasRegistrations);
    feedback = { severity: 'success', message: t('Event Saved') };

    if (actionId === actionIds.publish) {
      EventSchema.parse({ ...data, races: races.map((r) => r.id) });

      if (user.role === Role.ORGANIZER || user.role === Role.ADMIN) {
        await publishEvent(event.id as string, data.name as string);

        if (user.role === Role.ADMIN) {
          const org = await findEventOrganizer(event.id);

          return redirect(org ? `/a/organizers/${org.id}` : '/a/organizers');
        }

        return redirect(
          `/o/event/${event.id}/dashboard?message=${t('Event Published')}`
        );
      }

      // User is not yet an organizer, so let's redirect him to create his organizer profile.
      // We may need to check if he has a profile already and if so, redirect him elsewhere.
      return redirect('/o/us');
    }

    if (actionId === actionIds.unpublish) {
      await unpublishEvent(event.id as string);
      feedback = { severity: 'success', message: t('Event Unpublished') };
    }

    return json({ feedback, ok: true });
  } catch (e) {
    if (!(e instanceof ZodError)) {
      const tc = await i18n.getFixedT(request, 'common');

      console.error('Failed to save event: ', e);
      return InternalServerError(tc('500 error message'));
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

function hackyEventRevival(
  event: EventWithRacesDifficultiesAndDocuments | null
): void {
  if (!event) {
    return;
  }
  // @ts-ignore
  event.startAt = new Date(event.startAt);
  // @ts-ignore
  event.endAt = new Date(event.endAt);
}

export default function OrganizerEventRoute() {
  type StrippedPerk = Omit<Perk, 'id' | 'eventId'> & {
    id: string | null;
  };
  const { t, ready, i18n } = useTranslation('create-event-form');
  const language = i18n.language as Language;
  const {
    sports,
    mapToken,
    event,
    perks: dbPerks,
    races: dbRaces,
    difficulties,
    hasRegistrations
  } = useLoaderData<LoaderData>() as unknown as LoaderData;
  const actionData = useActionData<ActionData>() as ActionData;
  const toast = useRef<Toast>(null);
  const fetcher = useFetcher();
  const feedback = actionData?.feedback;

  const [perks, setPerks] = useState<Array<StrippedPerk>>(dbPerks);
  const [races, setRaces] = useState<Array<Race>>(dbRaces);
  const [deleteEventModalOpen, setDeleteEventModalOpen] =
    useState<boolean>(false);
  const [publishEventModalOpen, setPublishEventModalOpen] =
    useState<boolean>(false);
  const [unpublishEventModalOpen, setUnpublishEventModalOpen] =
    useState<boolean>(false);
  const [isPublish, setIsPublish] = useState<boolean>(false);
  const [isUnpublish, setIsUnpublish] = useState<boolean>(false);
  const [eventDate, setEventDate] = useState<Date | null>(event.startAt ? new Date(event.startAt) : null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number>(
    event.difficultyId ? event?.difficultyId : 1
  );
  const inputEl = useRef<HTMLInputElement>(null);
  const deleteForm = useRef<HTMLFormElement>(null);
  const eventForm = useRef<HTMLFormElement>(null);

  const isPublished = event.status === Status.published;
  const [regulationOption, setRegulationOption] = useState<'text' | 'file'>(
    event.regulationPath ? 'file' : 'text'
  );
  const [fileUploadHandlerEvent, setFileUploadHandlerEvent] =
    useState<FileUploadHandlerEvent | null>(null);
  const [regulationError, setRegulationError] = useState<string | null>(null);
  let fileName: string | null = null;

  if (event.regulationPath && event.regulationFileName) {
    fileName = event.regulationFileName;
  }

  // Hack: while remix doesn't handle dates properly
  hackyEventRevival(event);

  function addPerk(name: string | undefined) {
    if (!name) {
      return;
    }

    const newPerks = [...perks];
    let max = newPerks[newPerks.length - 1].displayOrder;
    const newDisplayOrder = ++max;

    newPerks.push({
      id: `new-perk-${newDisplayOrder}`,
      name,
      isDefault: false,
      isEnabled: true,
      displayOrder: newDisplayOrder,
      createdAt: new Date()
    });
    setPerks(newPerks);

    if (inputEl.current) {
      (inputEl.current as HTMLInputElement).value = '';
    }
  }

  function handleDeletePerk(e: React.MouseEvent) {
    const perkId = e.currentTarget.id;

    if (!perkId) {
      return;
    }

    const newPerks = perks.filter((p) => p.id !== perkId);

    setPerks(newPerks);
  }

  function handleOnCreatePerk(e: React.FocusEvent<HTMLInputElement>) {
    if (!e.target.value) {
      return null;
    }

    addPerk(e?.target.value);
  }

  function handlerAddPerkOnEnter(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') {
      return;
    }

    addPerk(inputEl.current?.value);
    e.preventDefault();
  }

  function handlerCancelEnter(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') {
      return;
    }

    e.stopPropagation();
    e.preventDefault();
  }

  function handleShowDeleteEventWarning() {
    setDeleteEventModalOpen(true);
  }

  function handleDiscardDeleteEvent() {
    setDeleteEventModalOpen(false);
  }

  function handleShowPublishEventDialog() {
    setIsPublish(true);
    setPublishEventModalOpen(true);
  }

  function handleDiscardPublishEvent() {
    setIsPublish(false);
    setPublishEventModalOpen(false);
  }

  function handleShowUnpublishEventDialog() {
    setIsUnpublish(true);
    setUnpublishEventModalOpen(true);
  }

  function handleDiscardUnpublishEvent() {
    setIsUnpublish(false);
    setUnpublishEventModalOpen(false);
  }

  function handlePublishEvent() {
    if (!eventForm.current) {
      return;
    }

    eventForm.current.submit();
    setPublishEventModalOpen(false);
  }

  function handleUnpublishEvent() {
    if (!eventForm.current) {
      return;
    }

    // submitting using ref will cause the page to refresh making it look wierd
    eventForm.current.submit();
    setUnpublishEventModalOpen(false);
  }

  function handleDeleteEvent() {
    if (!deleteForm.current) {
      return;
    }
    deleteForm.current.submit();
    setDeleteEventModalOpen(false);
  }

  function uploadHandler(f: FileUploadHandlerEvent) {
    const file = f.files[0];
    const formData = new FormData();

    if (file) {
      formData.append('file', file);
    }

    setFileUploadHandlerEvent(f);
    fetcher.submit(
      formData,
      {
        encType: 'multipart/form-data',
        // submitting to another route, because of a conflict uploading a file and images
        action: `/o/event/${event.id}/regulation/upload`,
        method: 'post'
      }
    );
  }

  function handleRegulationOption(e: ChangeEvent<HTMLInputElement>) {
    setRegulationOption(e.target.value as 'text' | 'file');
  }

  let resetFormToNonDirty: () => void | null;

  useEffect(() => {
    const typeOfFetcher = fetcherType(fetcher);
    const fetcherData = fetcher?.data as { ok?: boolean; errors?: string[] };

    if (fetcherData?.ok && typeOfFetcher === 'actionReload') {
      fileUploadHandlerEvent?.options?.clear();
      setRegulationError(null);
    }

    if (fetcherData?.errors && typeOfFetcher === 'actionReload') {
      fileUploadHandlerEvent?.options?.clear();
      setRegulationError(t('Invalid File Type'));
    }

    setRaces(dbRaces);
  }, [fileUploadHandlerEvent, fetcher, dbRaces, t]);

  useEffect(() => {
    const main = window.document.querySelector('#organizer-main-container');

    if (!toast.current) {
      return;
    }

    if (actionData?.errors) {
      toast.current.show({
        severity: 'error',
        detail: t('Remaining Form Errors'),
        life: 3000
      });

      main?.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (!feedback) {
      return;
    }

    toast.current.show({
      severity: feedback.severity,
      detail: feedback.message,
      life: 3000
    });

    main?.scrollTo({ top: 0, behavior: 'smooth' });

    if (actionData?.ok && resetFormToNonDirty) {
      resetFormToNonDirty();
    }
  }, [feedback, actionData, t]);

  // Fix to event's missing translations 🤷‍♂️
  // Found it on this thread https://dev.to/adrai/how-to-internationalize-a-remix-application-2bep
  if (!ready) {
    return <H2>Loading...</H2>;
  }

  const sortedSports = sports.sort((a, b) => {
    const sportA = a.name[language].toLowerCase();
    const sportB = b.name[language].toLowerCase();

    if (sportA < sportB) {
      return -1;
    }

    if (sportA < sportB) {
      return -1;
    }

    return 0;
  });

  function handleOnEventDateChange(date: Date | null) {
    setEventDate(date);
  }

  function handleOnSelectDifficulty(value: number) {
    setSelectedDifficulty(value);
  }

  function handleSetResetDirtyFormFunction(f: () => void) {
    resetFormToNonDirty = f;
  }

  return (
    <Main>
      <div className="mb-24">
        <Toast ref={toast} />
        <UploadForm
          method="post"
          className="w-full"
          ref={eventForm}
          blockNavigationWhenDirty={true}
          reset={handleSetResetDirtyFormFunction}
        >
          {isPublish && (
            <input type="hidden" name="actionId" value={actionIds.publish} />
          )}
          {isUnpublish && (
            <input type="hidden" name="actionId" value={actionIds.unpublish} />
          )}
          <div className="mb-12 lg:mb-20">
            <div
              className={clsx('flex flex-row items-center md:gap-x-2', {
                'justify-between': !isPublished,
                'justify-end': isPublished
              })}
            >
              {!isPublished && <H2>{t('Create Event')}</H2>}
              <ButtonGroup>
                {isPublished && (
                  <ButtonLink
                    id="back-button"
                    variant="secondary"
                    to={`/o/event/${event.id}/dashboard`}
                  >
                    {t('Back Button')}
                  </ButtonLink>
                )}
                <Button type="submit" variant="secondary">
                  {event.status === 'auto'
                    ? t('Create Button')
                    : t('Save Button')}
                </Button>
                {event.status !== Status.auto && !isPublished && (
                  <>
                    <ButtonLink
                      id="preview-button"
                      variant="secondary"
                      size="medium"
                      to={`/o/event/preview/${event.id}`}
                    >
                      {t('Preview Button')}
                    </ButtonLink>
                    <Button
                      id="publish"
                      className="mb-4 md:mb-0"
                      type="button"
                      onClick={handleShowPublishEventDialog}
                      size="medium"
                      data-cy="publish"
                    >
                      {t('Publish Button')}
                    </Button>
                  </>
                )}
              </ButtonGroup>
            </div>
          </div>
          <div onKeyDown={handlerCancelEnter}>
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
                  options={sortedSports.map((s: Sport) => {
                    return { value: s.id, label: s.name };
                  })}
                />
              </FormField>

              <FormField
                label={t('Date')}
                id="event-date"
                className="w-full md:basis-1/3 md:pr-4"
                error={actionData?.errors?.startAt}
              >
                <BasicDatePicker
                  name="event-date"
                  date={event?.startAt}
                  minDate={new Date()}
                  onChange={handleOnEventDateChange}
                />
              </FormField>

              <FormField
                label={t('Difficulty')}
                id="event-difficulty"
                className="w-full md:basis-1/3"
              >
                <DifficultiesDropdown
                  name="difficulty"
                  defaultValue={selectedDifficulty}
                  difficulties={difficulties}
                  language={language}
                  onChange={handleOnSelectDifficulty}
                />
              </FormField>
            </div>

            <LocationPicker
              token={mapToken}
              name="location"
              defaultValue={event?.location as DiciLocation}
              defaultPlaceName={event?.placeName}
              error={
                actionData?.errors?.coordinates || actionData?.errors?.placeName
              }
            />

            <PickBookingSystem
              name="booking"
              t={t}
              event={event}
              isPublished={isPublished}
              hasRegistrations={hasRegistrations}
              errorBibStartingNumber={actionData?.errors?.bibStartingNumber}
              errorBookingStopsAt={actionData?.errors?.bookingStopsAt}
              errorExternalBookingUrl={actionData?.errors?.externalBookingUrl}
              eventDate={eventDate}
            />

            <FormField
              label={t('Event Photos')}
              id="event-photos"
              description={t('Event Photos Description')}
            >
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
                  defaultValue={event.image5}
                  className="md:w-1/3"
                />
              </div>
            </FormField>

            <FormField
              label={t('External Website Url')}
              error={actionData?.errors?.externalWebsite}
            >
              <TextField
                name="external-website"
                type="text"
                placeholder={t('External Website Url Placeholder')}
                defaultValue={event.externalWebsite || ''}
              />
            </FormField>

            <FormField
              label={t('Description')}
              error={actionData?.errors?.description}
            >
              <div className="mt-1 relative rounded-md">
                <TextArea
                  name="event-description"
                  className="input-text h-80"
                  placeholder={t('Event description')}
                  defaultValue={event.description}
                />
              </div>
            </FormField>

            <FormField label={t('Perks')} description={t('Perks Description')}>
              <div className="grid grid-rows-8 md:grid-rows-6 md:grid-flow-col gap-y-4 md:gap-y-2 mb-2">
                {perks
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((p: any, index: number) => (
                    <div key={p.id} className="flex items-center mb-1">
                      <input
                        data-cy={`perk-${index}`}
                        type="checkbox"
                        id={p.id}
                        name={p.isDefault ? 'perks' : 'new-perk'}
                        value={p.isDefault ? p.id : p.name}
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
                      {!p.isDefault && (
                        <button
                          id={p.id}
                          type="button"
                          onClick={handleDeletePerk}
                          className="rounded-full h-4 w-4 ml-2 mb-1 bg-blueGray-300 dark:bg-blueGray-600 flex items-center justify-center"
                        >
                          <XMarkIcon className="h-3 w-3 inline-block text-blueGray-500 dark:text-blueGray-400" />
                        </button>
                      )}
                    </div>
                  ))}
                <div>
                  <input
                    ref={inputEl}
                    name="new-perk-input"
                    type="text"
                    placeholder={t('Type to create new')}
                    onBlur={handleOnCreatePerk}
                    onKeyDown={handlerAddPerkOnEnter}
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
                  type="submit"
                  name="actionId"
                  value={actionIds.addNewRace}
                >
                  {t('Create Distance')}
                </Button>

                <Button
                  className="flex lg:hidden"
                  type="submit"
                  name="actionId"
                  value={actionIds.addNewRace}
                  size="small"
                  id="create-race"
                >
                  <PlusIcon className="md:h-6 w-6 m-0 inline-block" />
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
              {actionData?.errors?.races && (
                <InputError className="mt-8" id="error-message">
                  {actionData?.errors?.races}
                </InputError>
              )}
            </div>

            <FormField
              label={t('Directions')}
              error={actionData?.errors?.directions}
            >
              <div className="mt-2 relative rounded-md">
                <TextArea
                  name="get-there"
                  className="input-text h-80"
                  placeholder={t('How to get there')}
                  defaultValue={event.directions}
                />
              </div>
            </FormField>

            <FormField label={t('Regulation')} error={regulationError}>
              <fieldset>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center">
                    <input
                      id="regulation-option-text"
                      name="regulation-option"
                      type="radio"
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                      defaultChecked={regulationOption === 'text'}
                      onChange={handleRegulationOption}
                      value="text"
                    />
                    <label
                      htmlFor="regulation-option-text"
                      className="ml-3 block text-sm font-medium text-gray-700"
                    >
                      {t('Write Regulation')}
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="regulation-option-file"
                      name="regulation-option"
                      type="radio"
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                      defaultChecked={regulationOption === 'file'}
                      onChange={handleRegulationOption}
                      value="file"
                    />
                    <label
                      htmlFor="regulation-option-file"
                      className="ml-3 block text-sm font-medium text-gray-700"
                    >
                      {t('Upload Regulation')}
                    </label>
                  </div>
                </div>
              </fieldset>
            </FormField>

            {regulationOption === 'text' && (
              <TextArea
                name="regulation"
                className="input-text h-80 mb-8"
                defaultValue={
                  event.regulationContent ? event.regulationContent : ''
                }
              />
            )}

            {regulationOption === 'file' && (
              <div className="h-80 mb-8">
                <UploadFile
                  name="file"
                  uploadButtonLabel={t('Upload Regulation Button')}
                  emptyDropZoneLabel={t('Regulation Dropzone')}
                  accept=".pdf"
                  uploadHandler={uploadHandler}
                  contentClassName="p-4"
                  className="w-full"
                />

                {event.regulationPath && fileName && (
                  <Link
                    to={`/event/${event.id}/regulation/view`}
                    target="_blank"
                    rel="noreferrer"
                    data-cy="regulation"
                  >
                    {fileName}
                  </Link>
                )}
              </div>
            )}

            {actionData?.errors?.regulation && (
              <InputError id="error-message">
                {actionData?.errors?.regulation}
              </InputError>
            )}

            <div id="documents" className="mb-12">
              <Label
                htmlFor="documents"
                className={clsx(
                  'mb-5 flex justify-between items-center flex-row'
                )}
              >
                {t('Documents')}

                <Button
                  className="hidden lg:flex"
                  type="submit"
                  name="actionId"
                  value="add-new-doc"
                >
                  {t('Upload Document')}
                </Button>
                <Button
                  type="submit"
                  name="actionId"
                  value="add-new-doc"
                  size="small"
                  className="flex lg:hidden"
                  id="create-document"
                >
                  <PlusIcon className="md:h-6 w-6 m-0 inline-block"></PlusIcon>
                </Button>
              </Label>
              <div>
                <DocumentsList documents={event.documents} eventId={event.id} />
              </div>
              <WhenListEmpty list={event.documents}>
                <div className="text-center p-12">
                  <H6 className="mb-2" as="p">
                    {t('No Documents - CTA')}
                  </H6>
                  <H6 variant="secondary" as="p">
                    {t('No Documents')}
                  </H6>
                </div>
              </WhenListEmpty>
            </div>

            <ButtonGroup className="mt-8">
              <ButtonLink type="button" variant="secondary" to="/o">
                {t('Cancel')}
              </ButtonLink>

              <Button
                type="submit"
                variant="primary"
                name={event.status === 'auto' ? 'create-event' : 'update-event'}
              >
                {event.status === 'auto'
                  ? t('Create Button')
                  : t('Save Button')}
              </Button>
            </ButtonGroup>
            {event.status !== 'auto' && !hasRegistrations && (
              <ButtonGroup className="mt-24 border-t border-gray-300 dark:border-gray-300 pt-6">
                {event.status === 'published' && (
                  <Button
                    id="unpublish"
                    className="mb-4 md:mb-0"
                    type="button"
                    size="medium"
                    variant="danger"
                    data-cy="unpublish"
                    onClick={handleShowUnpublishEventDialog}
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
              </ButtonGroup>
            )}
            {actionData?.errors?.submit && (
              <InputError className="mt-8" id="500-error-message">
                {actionData?.errors?.submit}
              </InputError>
            )}
          </div>
        </UploadForm>
      </div>

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

      <ConfirmationDialog
        isOpen={publishEventModalOpen}
        title={t('Publish Event X', { name: event?.name })}
        question={t('Are you sure you want to publish event?')}
        primaryLabel={t('Confirm Publish Event')}
        secondaryLabel={t('Cancel Publish Event')}
        onDismiss={handleDiscardPublishEvent}
        onConfirm={handlePublishEvent}
        className="cy-publish-dialog"
      />

      <ConfirmationDialog
        isOpen={unpublishEventModalOpen}
        title={t('Unpublish Event X', { name: event?.name })}
        question={t('Are you sure you want to unpublish event?')}
        primaryLabel={t('Confirm Unpublish Event')}
        secondaryLabel={t('Cancel Unpublish Event')}
        onDismiss={handleDiscardUnpublishEvent}
        onConfirm={handleUnpublishEvent}
        className="cy-unpublish-dialog"
      />

      <Form
        id="profile-form"
        method="post"
        noValidate
        aria-describedby="general-error"
        className="hidden"
        ref={deleteForm}
      >
        <input type="hidden" name="actionId" value={actionIds.deleteEvent} />
      </Form>
    </Main>
  );
}
