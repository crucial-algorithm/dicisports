import type { ActionFunction, LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { CheckoutStatus } from '@prisma/client';

import type { FetcherWithComponents } from '@remix-run/react';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { z, ZodError } from 'zod';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

import DisplayDate from '~/components/shared/DIsplayDate';

import { getClientSession } from '~/server/auth/client.server';
import {
  findShirtSizes,
  findUserParticipants,
  findUserEventRaceParticipants,
  getUserCheckoutRaces,
  updateParticipant,
  updateBookingStatus,
  updateToSelectedParticipant
} from '~/server/db/checkout.server';
import Main from '~/components/shared/Main';
import { findEvent } from '~/server/db/events.server';
import { H2, H4, H5, H6 } from '~/components/shared/typography';

import type {
  Cart,
  Event,
  Language,
  Participant,
  ParticipantInput,
  Race,
  RaceParticipant,
  ShirtSize
} from '~/types';
import DisplayCart from '~/components/shared/DisplayCart';
import TextField from '~/components/shared/form/TextField';
import FormField from '~/components/shared/form/FormField';

import ComboBox from '~/components/shared/form/ComboBox';
import BasicDatePicker from '~/components/shared/form/DatePicker';
import Button from '~/components/shared/Button';
import i18n from '~/server/i18n.server';
import { badRequest, displayTimeOfDay } from '~/utils/misc';
import { Notification } from '~/components/shared/NotificationMessage';
import ButtonGroup from '~/components/shared/ButtonGroup';
import { getUser } from '~/server/auth/session.server';

import countries from '~/server/db/countries.json';

const actions = {
  add: 'add',
  update: 'update',
  updateAndSave: 'updateAndSave',
  checkout: 'checkout',
  removeParticipant: 'removeParticipant',
  addParticipants: 'addParticipants'
};

type LoaderData = {
  event: Event;
  cart: Cart[];
  raceParticipants: RaceParticipant[] | null;
  userParticipants: Participant[];
  userSavedParticipants: Participant[] | null;
  isAuth: boolean;
};

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const form = await request.formData();
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const eventId = params.eventId as string;

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();
  const actionId = form.get('actionId');
  const hash = form.get('hash') as string;

  if (actionId === actions.checkout) {
    const raceParticipants = await findUserEventRaceParticipants(
      clientId,
      eventId
    );

    if (!raceParticipants) {
      return badRequest({ error: t('No Race Participants') });
    }

    // Draft participants are empty; Save participants are validated ensuring all required is filed in
    // Testing for firstName === null finds participants that haven't yet been saved successfully
    const draftParticipants = raceParticipants.filter(
      (rp) => rp.participant.firstName === null
    );

    if (draftParticipants.length) {
      return badRequest({
        errors: {
          missingFilledParticipants:
            draftParticipants.length + ' ' + t('Participant Not Filled')
        },
        hash: parseInt(hash),
        missingParticipants: JSON.stringify(draftParticipants)
      });
    }

    await updateBookingStatus(CheckoutStatus.pending, clientId, eventId);

    return redirect(`/checkout/payment/${eventId}`);
  }

  try {
    const phoneNumber = form.get('phone-number') as string;
    const data: ParticipantInput = {
      id: form.get('participant-id') as string,
      firstName: form.get('first-name') as string,
      lastName: form.get('last-name') as string,
      gender: form.get('gender') as string,
      birthday: new Date(form.get('birthday') as string),
      phoneNumber: parseInt(phoneNumber),
      identityCard: (form.get('identity-card') as string) || null,
      federationNumber:
        parseInt(form.get('federation-number') as string) || null,
      shirtSize: parseInt(form.get('shirt') as string),
      nationality: parseInt(form.get('nationality') as string) || null,
      postalCode: form.get('postal-code') as string
    };

    const ParticipantSchema = z.object({
      firstName: z
        .string({ required_error: t('Field Required') })
        .min(2, { message: t('Min 2 Chars') }),
      lastName: z
        .string({ required_error: t('Field Required') })
        .min(2, { message: t('Min 2 Chars') }),
      gender: z
        .string({ required_error: t('Field Required') })
        .min(1, { message: t('Field Required') }),
      birthday: z
        .date({ required_error: t('Field Required') })
        .max(new Date(), t('Past Date')),
      phoneNumber: z
        .number({
          required_error: t('Field Required'),
          invalid_type_error: t('Field Required')
        })
        .refine((val) => val.toString().length === 9, t('9 Digits'))
        .refine(
          (val) =>
            val.toString().startsWith('91') ||
            val.toString().startsWith('92') ||
            val.toString().startsWith('93') ||
            val.toString().startsWith('96'),
          t('Invalid number')
        ),
      identityCard: z.string().nullable(),
      federationNumber: z.number().nullable(),
      shirtSize: z.number({
        required_error: t('Field Required'),
        invalid_type_error: t('Field Required')
      }),
      nationality: z.number().nullable(),
      postalCode: z
        .string({ required_error: t('Field Required') })
        .min(1, { message: t('Field Required') })
    });

    if (actionId === actions.updateAndSave) {
      const selectedParticipantId = form.get(
        'selected-participant-id'
      ) as string;
      const raceId = form.get('raceId') as string;

      try {
        await updateToSelectedParticipant(
          data.id,
          selectedParticipantId,
          raceId
        );
      } catch (e) {
        console.log(e);

        return badRequest({
          errors: { selectedParticipant: t('Existing Race Participant') },
          hash: parseInt(hash)
        });
      }

      data.id = selectedParticipantId;
      ParticipantSchema.parse(data);
      await updateParticipant(data);
    }

    if (actionId === actions.update) {
      ParticipantSchema.parse(data);
      await updateParticipant(data);
    }

    return json({ ok: true, action: actionId });
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

export const loader: LoaderFunction = async ({ request, params }) => {
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const eventId = params.eventId as string;

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();
  const event = await findEvent(eventId);
  const cart = await getUserCheckoutRaces(clientId, eventId);
  const raceParticipants = await findUserEventRaceParticipants(
    clientId,
    eventId
  );

  if (!event) {
    return redirect('/');
  }

  if (raceParticipants?.length === 0) {
    return redirect(`/checkout/registrations/${eventId}`);
  }

  const userParticipants = await findUserParticipants(clientId);
  const shirtSizes = await findShirtSizes();

  return json({
    event,
    cart,
    raceParticipants,
    userParticipants,
    shirtSizes,
    isAuth: !!authenticatedClient
  });
};

export default function CheckoutInfoRoute() {
  const fetcher = useFetcher();
  const { t } = useTranslation('checkout');
  const {
    event,
    cart,
    raceParticipants,
    userParticipants,
    shirtSizes,
    isAuth
  } = useLoaderData<LoaderData>();
  const defaultSelectedParticipant =
    userParticipants[
      userParticipants.findIndex(
        (p: Participant) => p.id === raceParticipants[0].participantId
      )
    ];
  const [participant, setParticipant] = useState<Participant | null>(
    defaultSelectedParticipant
  );
  const [selectedRace, setSelectedRace] = useState<string | null>(
    raceParticipants[0].raceId
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [hash, setHash] = useState<number>(Date.now());
  const [message, setMessage] = useState<string>('');
  let showNotification: any = null;
  const [showAddRacesDialog, setShowAddRacesDialog] = useState<boolean>(false);
  const [isReset, setIsReset] = useState<boolean>(false);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const [missingParticipants, setMissingParticipants] = useState<
    RaceParticipant[]
  >([]);

  const resetForm = useCallback(() => {
    setErrors({});
    setHash(Date.now());
    setSelectedParticipant(null);
  }, []);

  const reset = useCallback(() => {
    setErrors({});
    setSelectedParticipant(null);
    setMissingParticipants([]);
  }, []);

  function handleSetParticipant(e: React.MouseEvent) {
    const newParticipant = e.currentTarget.id.split('|')[0];
    const index = userParticipants.findIndex(
      (a: RaceParticipant) => a.id === newParticipant
    );
    const participant = userParticipants[index];

    setParticipant(participant);
    setSelectedRace(e.currentTarget.id.split('|')[1]);
    setErrors({});
    setHash(Date.now());
    setSelectedParticipant(null);
  }

  function handlerSetShowNotificationFunction(callback: () => void) {
    showNotification = callback;
  }

  function handleRemoveRaceParticipant() {
    fetcher.submit(
      {
        actionId: actions.removeParticipant,
        participantId: participant?.id as string,
        raceId: selectedRace as string
      },
      {
        method: 'post',
        action: '/checkout/manage'
      }
    );
  }

  function handleOpenAddRaces() {
    setShowAddRacesDialog(true);
    setIsReset(false);
  }

  function handleCloseAddRaces() {
    setShowAddRacesDialog(false);
    setIsReset(true);
  }

  function handleSetSelectedParticipant(v: string | number) {
    const participant: Participant =
      userParticipants[
        userParticipants.findIndex((p: Participant) => p.id === v)
      ];

    setHash(Date.now());
    setSelectedParticipant(participant);
  }

  useEffect(() => {
    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data.action === actions.removeParticipant
    ) {
      setMessage(t('Participant Removed'));
      showNotification();

      return reset;
    }

    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data.action === actions.update
    ) {
      setMessage(t('Participant Saved'));
      showNotification();

      return reset;
    }

    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data.action === actions.updateAndSave
    ) {
      setMessage(t('Participant Saved and Updated'));
      showNotification();

      return reset;
    }

    if (
      fetcher.type === 'actionReload' &&
      fetcher.data?.errors &&
      fetcher.data?.hash === hash &&
      fetcher.data?.missingParticipants
    ) {
      setMissingParticipants(JSON.parse(fetcher.data.missingParticipants));

      return setErrors(fetcher.data.errors as FormErrors);
    }

    if (
      fetcher.type === 'done' &&
      fetcher.data?.errors &&
      fetcher.data?.hash === hash
    ) {
      return setErrors(fetcher.data.errors as FormErrors);
    }
  }, [reset, resetForm, fetcher, t, showNotification, hash, errors, setErrors]);

  return (
    <Main>
      <div className="flex flex-col justify-start space-y-1">
        <H2>
          <b data-cy="name" className="break-words w-full">
            {event.name}
          </b>
        </H2>
        <H6>
          <DisplayDate date={new Date(event.startAt)} />
        </H6>
        <H6>{event.address}</H6>
      </div>

      <div className="w-full my-8 flex flex-row scroll-mx-2 items-center items-start flex-nowrap overflow-x-auto snap-x">
        {raceParticipants
          .sort(
            (a: RaceParticipant, b: RaceParticipant) =>
              a.displayOrder - b.displayOrder
          )
          .map((p: RaceParticipant, index: number) => (
            <div className="flex flex-col items-center" key={p.id}>
              <div
                className={clsx(
                  'flex flex-col gap-y-2 border-2 border-b p-2 mx-2 items-center w-[200px] snap-center cursor-pointer relative',
                  p.participantId === participant?.id &&
                    p.race.id === selectedRace
                    ? 'opacity-100'
                    : 'opacity-50',
                  missingParticipants.find(
                    (v) => v.participant.id === p.participant.id
                  )
                    ? 'border-red-500'
                    : 'border-gray-500'
                )}
                id={p.participantId + '|' + p.race.id}
                onClick={handleSetParticipant}
                data-cy={`participant-${index + 1}`}
              >
                {p.participantId === participant?.id &&
                  p.race.id === selectedRace && (
                    <button
                      type="button"
                      onClick={handleRemoveRaceParticipant}
                      name="remove"
                      className="absolute top-[6px] right-[6px]"
                    >
                      <XMarkIcon className="dark:text-blueGray-500 md:h-6 w-6 m-0 inline-block" />
                    </button>
                  )}
                <H5 data-cy="participant">{p.race.name}</H5>
                <H6
                  className="dark:text-blueGray-500"
                  data-cy={`participant-name-${index + 1}`}
                >
                  {p.participant.firstName
                    ? p.participant.firstName
                    : t('Participant') + ' ' + (index + 1)}
                </H6>
              </div>
            </div>
          ))}
        <div className="flex flex-col items-center snap-center">
          <div
            className="flex flex-col gap-y-2 border-2 border-b border-gray-500 p-2 mx-2 items-center w-[200px]"
            onClick={handleOpenAddRaces}
          >
            <PlusIcon className="h-7 w-7 dark:text-blueGray-500" />
            <H6 className="dark:text-blueGray-500">{t('Add Race')}</H6>
          </div>
        </div>
      </div>

      {!isAuth && (
        <div className="flex flex-row items-center justify-end gap-x-2">
          <H6>{t('Already Have An Account ?')}</H6>
          <a href="/login?a=checkout" data-cy="authenticate">
            <H6 className="dark:text-blueGray-500 cursor-pointer">
              {t('Login')}
            </H6>
          </a>
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        <div className="flex-col w-full lg:pr-8 xl:w-[calc(100%-(480px))] xl:pr-48">
          <ParticipantForm
            participant={participant}
            hash={hash}
            errors={errors}
            userSavedParticipants={userParticipants.filter(
              (p: Participant) => p.firstName !== null
            )}
            raceId={selectedRace}
            fetcher={fetcher}
            selectedParticipant={selectedParticipant}
            setSelectedParticipant={handleSetSelectedParticipant}
            shirtSizes={shirtSizes}
            resetForm={resetForm}
          />
          <Notification show={handlerSetShowNotificationFunction}>
            {message}
          </Notification>
        </div>
        <div className="w-full mt-8 lg:w-[370px] xl:w-[480px] lg:mt-0">
          <DisplayCart
            cart={cart}
            event={event}
            error={errors.missingFilledParticipants}
            fetcher={fetcher}
            hash={hash}
            showContinueLabel={true}
            showUpdateCartButton={true}
          />
        </div>
      </div>

      <AddRacesDialog
        isOpen={showAddRacesDialog}
        triggerModalClose={handleCloseAddRaces}
        eventRaces={event.races}
        reset={isReset}
      />
    </Main>
  );
}

type FormErrors = {
  firstName?: string;
  lastName?: string;
  gender?: string;
  birthday?: string;
  phoneNumber?: string;
  identityCard?: string;
  federationNumber?: string;
  shirtSize?: string;
  nationality?: string;
  postalCode?: string;
  selectedParticipant?: string;
  missingFilledParticipants?: string;
};

function ParticipantForm({
  participant,
  hash,
  errors,
  userSavedParticipants,
  raceId,
  fetcher,
  selectedParticipant,
  setSelectedParticipant,
  shirtSizes,
  resetForm
}: {
  participant: Participant | null;
  hash: number;
  errors?: FormErrors;
  userSavedParticipants: Participant[] | null;
  raceId: string | null;
  fetcher: FetcherWithComponents<any>;
  selectedParticipant: Participant | null;
  setSelectedParticipant: (v: string | number) => void;
  shirtSizes: ShirtSize[];
  resetForm: () => void;
}) {
  const { t, i18n } = useTranslation('checkout');
  const language = i18n.language as Language;

  const genderOptions = [
    { value: 'F', label: t('Female') },
    { value: 'M', label: t('Male') }
  ];

  return (
    <fetcher.Form
      method="post"
      className={clsx('w-full', participant ? 'opacity-100' : 'opacity-50')}
      key={hash}
    >
      {participant &&
        userSavedParticipants &&
        userSavedParticipants.length !== 0 && (
          <div className="mb-8">
            <FormField
              label={t('Select Participant')}
              error={errors?.selectedParticipant}
              className="w-full"
            >
              <ComboBox
                id="saved-participants"
                name="userSavedParticipants"
                placeholder=""
                options={userSavedParticipants.map((u) => {
                  return { value: u.id, label: u.firstName + ' ' + u.lastName };
                })}
                onChange={setSelectedParticipant}
                className="w-[50%] mr-2"
              />
            </FormField>
          </div>
        )}
      <div className="flex flex-col md:flex-row md:space-x-2">
        <FormField
          label={t('First Name')}
          id="first-name"
          error={errors?.firstName}
          dataCy="firstName"
        >
          <TextField
            data-cy="first-name"
            name="first-name"
            placeholder={t('First Name Placeholder')}
            defaultValue={
              (selectedParticipant?.firstName as string) ||
              (participant?.firstName as string)
            }
          />
        </FormField>

        <FormField
          label={t('Last Name')}
          id="last-name"
          error={errors?.lastName}
          dataCy="lastName"
        >
          <TextField
            name="last-name"
            placeholder={t('Last Name Placeholder')}
            defaultValue={
              (selectedParticipant?.lastName as string) ||
              (participant?.lastName as string)
            }
          />
        </FormField>
      </div>

      <FormField label={t('Gender')} error={errors?.gender} dataCy="gender">
        <ComboBox
          name="gender"
          placeholder={t('Gender Placeholder')}
          options={genderOptions}
          lang={language}
          defaultValue={
            (selectedParticipant?.gender as string) ||
            (participant?.gender as string)
          }
        />
      </FormField>

      <div className="flex flex-col md:flex-row md:space-x-2">
        <FormField
          label={''}
          id="birthday"
          error={errors?.birthday}
          dataCy="birthday"
        >
          <BasicDatePicker
            label={t('Birthday')}
            name="birthday"
            date={
              selectedParticipant?.birthday
                ? new Date(selectedParticipant.birthday)
                : participant?.birthday
                ? new Date(participant.birthday)
                : new Date()
            }
          />
        </FormField>

        <FormField
          label={t('Phone Number')}
          id="phone-number"
          error={errors?.phoneNumber}
          dataCy="phoneNumber"
        >
          <TextField
            type="number"
            name="phone-number"
            placeholder={t('Required')}
            defaultValue={
              (selectedParticipant?.phoneNumber as number) ||
              (participant?.phoneNumber as number)
            }
          />
        </FormField>
      </div>

      <div className="flex flex-col md:flex-row md:space-x-2">
        <FormField
          label={t('Identity Card')}
          id="identity-card"
          error={errors?.identityCard}
          dataCy="identityCard"
        >
          <TextField
            name="identity-card"
            placeholder={t('Optional')}
            defaultValue={
              (selectedParticipant?.identityCard as string) ||
              (participant?.identityCard as string)
            }
          />
        </FormField>

        <FormField
          label={t('National Federation Number')}
          id="federation-number"
          error={errors?.federationNumber}
          dataCy="federationNumber"
        >
          <TextField
            type="number"
            name="federation-number"
            placeholder={t('Optional')}
            defaultValue={
              (selectedParticipant?.federationNumber as number) ||
              (participant?.federationNumber as number)
            }
          />
        </FormField>
      </div>

      <FormField
        label={t('Shirt Size')}
        error={errors?.shirtSize}
        dataCy="shirtSize"
      >
        <ComboBox
          name="shirt"
          placeholder={t('Shirt Placeholder')}
          lang={language}
          options={shirtSizes.map((ss: ShirtSize) => {
            return { value: ss.id, label: ss.name as string };
          })}
          defaultValue={
            (selectedParticipant?.shirtSize as number) ||
            (participant?.shirtSize as number)
          }
        />
      </FormField>

      <FormField
        label={t('Native From')}
        id="nationality"
        error={errors?.nationality}
        dataCy="nationality"
      >
        <ComboBox
          name="nationality"
          placeholder={t('Optional')}
          lang={language}
          options={countries.map((c) => {
            return { value: c.id, label: c.name };
          })}
          defaultValue={
            (selectedParticipant?.nationality as number) ||
            (participant?.nationality as number)
          }
        />
      </FormField>

      <FormField
        label={t('Postal Code')}
        id="postal-code"
        error={errors?.postalCode}
        dataCy="postalCode"
      >
        <TextField
          name="postal-code"
          placeholder={t('Required')}
          defaultValue={
            (selectedParticipant?.postalCode as string) ||
            (participant?.postalCode as string)
          }
        />
      </FormField>

      {participant && (
        <input type="hidden" name="participant-id" value={participant.id} />
      )}

      {selectedParticipant && (
        <>
          <input
            type="hidden"
            name="selected-participant-id"
            value={selectedParticipant.id}
          />
          <input type="hidden" name="raceId" value={raceId as string} />
        </>
      )}

      <input type="hidden" name="hash" value={hash} />
      <ButtonGroup>
        <Button
          type="submit"
          value={actions.update}
          name="actionId"
          disabled={!participant}
          id="save-button"
        >
          {t('Save')}
        </Button>
        {selectedParticipant && (
          <Button
            type="submit"
            value={actions.updateAndSave}
            name="actionId"
            disabled={!participant}
            id="save-update-button"
            variant="secondary"
          >
            {t('Save and Update') +
              ' ' +
              selectedParticipant.firstName +
              ' ' +
              selectedParticipant.lastName}
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={resetForm}>
          {t('Reset')}
        </Button>
      </ButtonGroup>
    </fetcher.Form>
  );
}

function AddRacesDialog({
  isOpen,
  triggerModalClose,
  eventRaces,
  reset
}: {
  isOpen: boolean;
  triggerModalClose: () => void;
  eventRaces: Race[];
  reset: boolean;
}) {
  const fetcher = useFetcher();
  const { t } = useTranslation('checkout');
  const [addedRaces, setAddedRaces] = useState<string[]>([]);

  const close = useCallback(() => {
    setAddedRaces([]);
    triggerModalClose();
  }, [triggerModalClose]);

  function handleAddRace(raceId: string) {
    setAddedRaces((p) => [...p, raceId]);
  }

  function handleRemoveRace(raceId: string) {
    const newArray = [...addedRaces];
    const index = addedRaces.indexOf(raceId);

    if (index !== -1) {
      newArray.splice(index, 1);
      setAddedRaces(newArray);
    }
  }

  useEffect(() => {
    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data?.action === actions.addParticipants
    ) {
      return close;
    }
  });

  return (
    <fetcher.Form method="post" action="/checkout/manage">
      <div
        data-reach-dialog-overlay={true}
        className={clsx({
          'hidden ': !isOpen,
          'z-50 flex h-screen': isOpen
        })}
      >
        <div
          aria-modal={true}
          aria-label={t('Add Race Modal')}
          className={clsx(
            'lg:w-[500px] w-full',
            'bg-white dark:bg-gray-900 font-extrabold',
            'lg:border-2 lg:border-black dark:lg:border-white lg:rounded-lg p-8',
            {
              'hidden ': !isOpen,
              'm-auto': isOpen
            }
          )}
        >
          {eventRaces
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((r) => (
              <DisplayRace
                race={r}
                key={r.id}
                addRace={handleAddRace}
                removeRace={handleRemoveRace}
                reset={reset}
              />
            ))}
          <ButtonGroup className="flex justify-end mt-4">
            <Button type="button" variant="secondary" onClick={close}>
              {t('Discard')}
            </Button>
            <Button
              type="submit"
              name="actionId"
              value={actions.addParticipants}
            >
              {t('Add')}
            </Button>
          </ButtonGroup>
        </div>
      </div>

      <input type="hidden" name="races" value={JSON.stringify(addedRaces)} />
    </fetcher.Form>
  );
}

function DisplayRace({
  race,
  addRace,
  removeRace,
  reset
}: {
  race: Race;
  addRace: (raceId: string) => void;
  removeRace: (raceId: string) => void;
  reset: boolean;
}) {
  const { t } = useTranslation('checkout');
  const raceTime = displayTimeOfDay(race.startTime);
  const [raceQtd, setRaceQtd] = useState<number>(0);

  function handleAddRace() {
    setRaceQtd((c) => c + 1);
    addRace(race.id);
  }

  function handleRemoveRace() {
    if (raceQtd !== 0) {
      setRaceQtd((c) => c - 1);
      removeRace(race.id);
    }
  }

  useEffect(() => {
    if (reset) {
      setRaceQtd(0);
    }
  }, [reset]);

  return (
    <div className="flex flex-col mt-8 w-full">
      <div className="flex flex-row items-center justify-between">
        <H4>{race.name}</H4>
        <H5>{race.price + '€'}</H5>
      </div>
      <div className="flex flex-row mt-2 justify-between items-center">
        <div className="flex flex-row">
          <div>
            <H6 className="dark:text-blueGray-500">{t('Distance')}</H6>
            <H5>{race.distance + ' km'}</H5>
          </div>

          <div className="ml-8">
            <H6 className="dark:text-blueGray-500">{t('Hour')}</H6>
            <H5>{raceTime}</H5>
          </div>
        </div>

        <div className="flex flex-row items-center dark:text-blueGray-500 w-[80px] justify-between">
          <button
            type="button"
            className="w-[24px] h-[24px]"
            onClick={handleRemoveRace}
          >
            <ChevronDownIcon className="md:h-6 w-6 m-0 inline-block" />
          </button>

          <H6 className="dark:text-blueGray-500">{raceQtd}</H6>
          <button
            type="button"
            className="w-[24px] h-[24px]"
            onClick={handleAddRace}
          >
            <ChevronUpIcon className="md:h-6 w-6 m-0 inline-block" />
          </button>
        </div>
      </div>
    </div>
  );
}
