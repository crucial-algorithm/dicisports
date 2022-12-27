import type { ActionFunction, LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';

import type { FetcherWithComponents } from '@remix-run/react';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { z, ZodError } from 'zod';

import DisplayDate from '~/components/shared/DIsplayDate';

import { getClientSession } from '~/server/auth/client.server';
import {
  addParticipantToRace,
  changeToSelectedRaceParticipant,
  findUserParticipants,
  findUserRaceParticipants,
  findUserSavedParticipants,
  getDistinctUserEventTickets,
  getUserCheckoutRaces,
  resetParticipant,
  updateParticipant
} from '~/server/db/checkout.server';
import Main from '~/components/shared/Main';
import { findEvent } from '~/server/db/events.server';
import { H2, H5, H6 } from '~/components/shared/typography';

import type {
  Cart,
  Event,
  Participant,
  ParticipantInput,
  RaceParticipant
} from '~/types';
import { DisplayCart } from '~/routes/checkout/tickets.$eventId';
import TextField from '~/components/shared/form/TextField';
import FormField from '~/components/shared/form/FormField';

import ComboBox from '~/components/shared/form/ComboBox';
import BasicDatePicker from '~/components/shared/form/DatePicker';
import Button from '~/components/shared/Button';
import i18n from '~/server/i18n.server';
import { badRequest } from '~/utils/misc';
import { Notification } from '~/components/shared/NotificationMessage';

const actions = {
  add: 'add',
  update: 'update',
  checkoutTickets: 'checkoutTickets',
  checkoutInfo: 'checkoutInfo',
  selectParticipant: 'selectParticipant',
  resetParticipant: 'resetParticipant'
};

type LoaderData = {
  event: Event;
  cart: Cart[];
  raceParticipants: RaceParticipant[] | null;
  userParticipants: Participant[];
  userSavedParticipants: Participant[] | null;
};

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const form = await request.formData();
  const clientSession = await getClientSession(request);
  const eventId = params.eventId as string;

  const clientId = clientSession.getClientId();
  const actionId = form.get('actionId');
  const hash = form.get('hash') as string;

  if (actionId === actions.checkoutTickets) {
    const userCheckoutRace = await getDistinctUserEventTickets(
      clientId,
      eventId
    );

    return userCheckoutRace?.map(
      async (c) => await addParticipantToRace(c.raceId as string, clientId)
    );
  }

  if (actionId === actions.selectParticipant) {
    const newUser = form.get('newUser') as string;
    const oldUser = form.get('oldUser') as string;
    const raceId = form.get('raceId') as string;

    try {
      await changeToSelectedRaceParticipant(newUser, oldUser, raceId);

      return json({ ok: true, action: actions.selectParticipant });
    } catch (e) {
      console.log(e);

      return badRequest({
        errors: { selectedParticipant: t('Existing Race Participant') },
        hash: parseInt(hash)
      });
    }
  }

  if (actionId === actions.resetParticipant) {
    const participantId = form.get('participantId') as string;
    const raceId = form.get('raceId') as string;

    await resetParticipant(participantId, clientId, raceId);

    return json({ ok: true, action: actions.resetParticipant });
  }

  try {
    if (actionId === actions.update) {
      const phoneNumber = form.get('phone-number') as string;
      const data: ParticipantInput = {
        id: form.get('participant-id') as string,
        firstName: form.get('first-name') as string,
        lastName: form.get('last-name') as string,
        gender: parseInt(form.get('gender') as string),
        birthday: new Date(form.get('birthday') as string),
        phoneNumber: parseInt(phoneNumber),
        cc: parseInt(form.get('cc') as string) || null,
        federationNumber:
          parseInt(form.get('federation-number') as string) || null,
        shirtSize: parseInt(form.get('shirt') as string),
        nationality: (form.get('nationality') as string) || null,
        postalCode: form.get('postal-code') as string
      };

      const ParticipantSchema = z.object({
        firstName: z
          .string({ required_error: t('Field Required') })
          .min(2, { message: t('Min 2 Chars') }),
        lastName: z
          .string({ required_error: t('Field Required') })
          .min(2, { message: t('Min 2 Chars') }),
        gender: z.number({
          required_error: t('Field Required'),
          invalid_type_error: t('Invalid Type')
        }),
        birthday: z
          .date({ required_error: t('Field Required') })
          .max(new Date(), t('Past Date')),
        phoneNumber: z
          .number({
            required_error: t('Field Required'),
            invalid_type_error: t('Invalid Type')
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
        cc: z
          .number()
          .refine((val) => val.toString().length === 9, t('9 Digits'))
          .nullable(),
        federationNumber: z.number().nullable(),
        shirtSize: z
          .number({
            required_error: t('Field Required'),
            invalid_type_error: t('Invalid Type')
          })
          .nonnegative(t('Invalid Option'))
          .max(6, t('Invalid Option')),
        nationality: z.string().nullable(),
        postalCode: z.string({ required_error: t('Field Required') })
      });

      ParticipantSchema.parse(data);
      await updateParticipant(data);
    }

    return json({ ok: true });
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
  const eventId = params.eventId as string;
  const clientSession = await getClientSession(request);

  const clientId = clientSession.getClientId();
  const event = await findEvent(eventId);
  const cart = await getUserCheckoutRaces(clientId, eventId);
  const raceParticipants = await findUserRaceParticipants(clientId, eventId);

  if (!event) {
    return redirect('/');
  }

  if (raceParticipants?.length === 0) {
    return redirect(`/checkout/tickets/${eventId}`);
  }

  const userParticipants = await findUserParticipants(clientId);
  const userSavedParticipants = await findUserSavedParticipants(clientId);

  return json({
    event,
    cart,
    raceParticipants,
    userParticipants,
    userSavedParticipants
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
    userSavedParticipants
  } = useLoaderData<LoaderData>();

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [selectedRace, setSelectedRace] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [hash, setHash] = useState<number>(Date.now());
  const [showSavedParticipants, setShowSavedParticipants] =
    useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  let showNotification: any = null;
  const [isParticipantSaved, setIsParticipantSaved] = useState<boolean>(false);

  const reset = useCallback(() => {
    setErrors({});
    setHash(Date.now());
    setSelectedRace(null);
    setParticipant(null);
    setIsParticipantSaved(false);
  }, []);

  function handleSetParticipant(e: React.MouseEvent) {
    const newParticipant = e.currentTarget.id.split('|')[0];
    const index = userParticipants.findIndex(
      (a: RaceParticipant) => a.id === newParticipant
    );
    const participant = userParticipants[index];
    const savedParticipant = userSavedParticipants.find(
      (s: Participant) => s.id === newParticipant
    );

    setParticipant(participant);
    setSelectedRace(e.currentTarget.id.split('|')[1]);
    setShowSavedParticipants(false);
    setErrors({});
    setHash(Date.now());
    setIsParticipantSaved(!!savedParticipant);
  }

  function handleShowSelectSavedParticipants() {
    setShowSavedParticipants(!showSavedParticipants);
  }

  function handlerSetShowNotificationFunction(callback: () => void) {
    showNotification = callback;
  }

  useEffect(() => {
    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data.action === actions.selectParticipant
    ) {
      setMessage(t('Participant Selected'));
      showNotification();

      return reset;
    }

    if (
      fetcher.type === 'actionReload' &&
      fetcher.data.ok &&
      fetcher.data.action === actions.resetParticipant
    ) {
      setMessage(t('Participant Reset'));
      showNotification();

      return reset;
    }

    if (fetcher.type === 'actionReload' && fetcher.data.ok) {
      setMessage(t('Participant Saved'));
      showNotification();

      return setErrors({});
    }

    if (
      fetcher.type === 'done' &&
      fetcher.data?.errors &&
      fetcher.data?.hash === hash
    ) {
      return setErrors(fetcher.data.errors as FormErrors);
    }
  }, [reset, fetcher, t, showNotification, hash, errors, setErrors]);

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

      <div className="w-full my-8 flex flex-row scroll-mx-2 items-center md:items-start md:flex-row md:flex-nowrap md:overflow-x-auto">
        {raceParticipants
          .sort(
            (a: RaceParticipant, b: RaceParticipant) =>
              a.displayOrder - b.displayOrder
          )
          .map((p: RaceParticipant, index: number) => (
            <div
              className={clsx(
                'flex flex-col gap-y-2 border-2 border-b border-gray-500 p-2 mx-2 items-center w-[200px]',
                p.participantId === participant?.id &&
                  p.race.id === selectedRace
                  ? 'opacity-100'
                  : 'opacity-50'
              )}
              key={p.id}
              id={p.participantId + '|' + p.race.id}
              onClick={handleSetParticipant}
              data-cy={`participant-${index + 1}`}
            >
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
          ))}
      </div>

      <div className="flex flex-col md:flex-row">
        <div className="flex-col w-full md:w-[50%] mt-8">
          <ParticipantForm
            participant={participant}
            hash={hash}
            errors={errors}
            userSavedParticipants={
              userSavedParticipants.length !== 0 ? userSavedParticipants : null
            }
            eventId={event.id}
            raceId={selectedRace}
            showSavedParticipants={showSavedParticipants}
            handleShowSelectSavedParticipants={
              handleShowSelectSavedParticipants
            }
            fetcher={fetcher}
            isParticipantSaved={isParticipantSaved}
          />
          <Notification show={handlerSetShowNotificationFunction}>
            {message}
          </Notification>
        </div>
        <div className="w-full mt-8 md:w-[50%] md:mt-0 md:pl-48">
          <DisplayCart cart={cart} event={event} isInfoRoute={true} />
        </div>
      </div>
    </Main>
  );
}

type FormErrors = {
  firstName?: string;
  lastName?: string;
  gender?: string;
  birthday?: string;
  phoneNumber?: string;
  cc?: string;
  federationNumber?: string;
  shirtSize?: string;
  nationality?: string;
  postalcode?: string;
  selectedParticipant?: string;
};

function ParticipantForm({
  participant,
  hash,
  errors,
  userSavedParticipants,
  eventId,
  raceId,
  showSavedParticipants,
  handleShowSelectSavedParticipants,
  fetcher,
  isParticipantSaved
}: {
  participant: Participant | null;
  hash: number;
  errors?: FormErrors;
  userSavedParticipants: Participant[] | null;
  eventId: string;
  raceId: string | null;
  showSavedParticipants: boolean;
  handleShowSelectSavedParticipants: () => void;
  fetcher: FetcherWithComponents<any>;
  isParticipantSaved: boolean;
}) {
  const { t } = useTranslation('checkout');
  const genderOptions = [
    { value: 1, label: t('Female') },
    { value: 2, label: t('Male') },
    { value: 3, label: t('Other') }
  ];
  const shirtOptions = [
    { value: 1, label: 'XS' },
    { value: 2, label: 'S' },
    { value: 3, label: 'M' },
    { value: 4, label: 'L' },
    { value: 5, label: 'XL' },
    { value: 6, label: 'XXL' }
  ];

  function handleOnSelectSavedParticipant(v: string | number) {
    fetcher.submit(
      {
        actionId: 'selectParticipant',
        newUser: v as string,
        oldUser: participant?.id as string,
        raceId: raceId as string,
        hash: String(hash)
      },
      {
        method: 'post',
        action: `/checkout/info/${eventId}`
      }
    );
  }

  function handleResetParticipant() {
    fetcher.submit(
      {
        actionId: 'resetParticipant',
        participantId: participant?.id as string,
        raceId: raceId as string
      },
      {
        method: 'post',
        action: `/checkout/info/${eventId}`
      }
    );
  }

  return (
    <fetcher.Form
      method="post"
      className={clsx('w-full', participant ? 'opacity-100' : 'opacity-50')}
      key={hash}
    >
      {participant && userSavedParticipants && (
        <div className="mb-8">
          <div onClick={handleShowSelectSavedParticipants}>
            <H6 data-cy="save-participants-description">
              {t('Saved Participants')}
            </H6>
          </div>
          {showSavedParticipants && (
            <FormField
              label=""
              error={errors?.selectedParticipant}
              className="flex flex-row items-center mt-2"
            >
              <ComboBox
                name="userSavedParticipants"
                placeholder=""
                options={userSavedParticipants.map((u) => {
                  return { value: u.id, label: u.firstName + ' ' + u.lastName };
                })}
                onChange={handleOnSelectSavedParticipant}
                defaultValue={participant.id}
                className="w-[50%] mr-2"
              />
              {isParticipantSaved && (
                <div onClick={handleResetParticipant}>
                  <H6 className="dark:text-blueGray-500">{t('Reset')}</H6>
                </div>
              )}
            </FormField>
          )}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:space-x-2">
        <FormField
          label={t('First Name')}
          id="first-name"
          error={errors?.firstName}
        >
          <TextField
            data-cy="first-name"
            name="first-name"
            placeholder={t('First Name')}
            defaultValue={participant?.firstName as string}
          />
        </FormField>

        <FormField
          label={t('Last Name')}
          id="last-name"
          error={errors?.lastName}
        >
          <TextField
            name="last-name"
            placeholder={t('Last Name')}
            defaultValue={participant?.lastName as string}
          />
        </FormField>
      </div>

      <FormField label={t('Gender')} error={errors?.gender}>
        <ComboBox
          name="gender"
          placeholder=""
          options={genderOptions}
          defaultValue={participant?.gender ? participant.gender : undefined}
        />
      </FormField>

      <div className="flex flex-col md:flex-row md:space-x-2">
        <FormField label={''} id="birthday" error={errors?.birthday}>
          <BasicDatePicker
            label={t('Birthday')}
            name="birthday"
            date={
              participant?.birthday
                ? new Date(participant.birthday)
                : new Date()
            }
          />
        </FormField>

        <FormField
          label={t('Phone Number')}
          id="phone-number"
          error={errors?.phoneNumber}
        >
          <TextField
            type="number"
            name="phone-number"
            placeholder={t('Phone Number')}
            defaultValue={
              participant?.phoneNumber ? participant?.phoneNumber : undefined
            }
          />
        </FormField>
      </div>

      <div className="flex flex-col md:flex-row md:space-x-2">
        <FormField label={t('CC')} id="CC" error={errors?.cc}>
          <TextField
            type="number"
            name="cc"
            placeholder={t('CC')}
            defaultValue={participant?.cc ? participant.cc : undefined}
          />
        </FormField>

        <FormField
          label={t('National Federation Number')}
          id="federation-number"
          error={errors?.federationNumber}
        >
          <TextField
            type="number"
            name="federation-number"
            placeholder={t('National Federation Number')}
            defaultValue={participant?.federationNumber as number}
          />
        </FormField>
      </div>

      <FormField label={t('Shirt Size')} error={errors?.shirtSize}>
        <ComboBox
          name="shirt"
          placeholder=""
          options={shirtOptions}
          defaultValue={participant?.shirtSize as number}
        />
      </FormField>

      <FormField
        label={t('Nationality')}
        id="nationality"
        error={errors?.nationality}
      >
        <TextField
          name="nationality"
          placeholder={t('Nationality')}
          defaultValue={participant?.nationality as string}
        />
      </FormField>

      <FormField
        label={t('Postal Code')}
        id="postal-code"
        error={errors?.postalcode}
      >
        <TextField
          name="postal-code"
          placeholder={t('Postal Code')}
          defaultValue={participant?.postalCode as string}
        />
      </FormField>

      {participant && (
        <input type="hidden" name="participant-id" value={participant.id} />
      )}

      <input type="hidden" name="hash" value={hash} />
      <Button
        type="submit"
        value={actions.update}
        name="actionId"
        disabled={!participant}
        id="save-button"
      >
        {t('Save')}
      </Button>
    </fetcher.Form>
  );
}
