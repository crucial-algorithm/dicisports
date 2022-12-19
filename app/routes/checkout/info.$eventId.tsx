import type { ActionFunction, LoaderFunction } from 'remix';
import { json } from 'remix';
import * as React from 'react';
import { useState } from 'react';

import { useActionData, useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { z, ZodError } from 'zod';

import DisplayDate from '~/components/shared/DIsplayDate';

import { getClientSession } from '~/server/auth/client.server';
import {
  findUserParticipants,
  findUserRaceParticipants,
  findUserSavedParticipants,
  getUserCheckoutRaces,
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
import UploadForm from '~/components/shared/form/UploadForm';
import TextField from '~/components/shared/form/TextField';
import FormField from '~/components/shared/form/FormField';

import ComboBox from '~/components/shared/form/ComboBox';
import BasicDatePicker from '~/components/shared/form/DatePicker';
import Button from '~/components/shared/Button';
import i18n from '~/server/i18n.server';
import { badRequest } from '~/utils/misc';

const actions = {
  add: 'add',
  update: 'update',
  checkout: 'checkout'
};

type LoaderData = {
  event: Event;
  cart: Cart[];
  raceParticipants: RaceParticipant[];
  userParticipants: Participant[];
  userSavedParticipants: Participant[] | null;
};

type ActionData = {
  errors?: {
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
  };
};

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'checkout');
  const form = await request.formData();

  const actionId = form.get('actionId');

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
          .min(5, { message: t('Min 5 Chars') }),
        lastName: z
          .string({ required_error: t('Field Required') })
          .min(5, { message: t('Min 5 Chars') }),
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
          .min(0, t('Invalid Option'))
          .max(5, t('Invalid Option')),
        nationality: z.string().nullable(),
        postalcode: z.string({ required_error: t('Field Required') })
      });

      ParticipantSchema.parse(data);
      await updateParticipant(data);
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

export const loader: LoaderFunction = async ({ request, params }) => {
  const eventId = params.eventId as string;
  const clientSession = await getClientSession(request);

  const clientId = clientSession.getClientId();
  const event = await findEvent(eventId);
  const cart = await getUserCheckoutRaces(clientId, eventId);
  const raceParticipants = await findUserRaceParticipants(clientId, eventId);
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
  const { t } = useTranslation('checkout');
  const {
    event,
    cart,
    raceParticipants,
    userParticipants,
    userSavedParticipants
  } = useLoaderData<LoaderData>();

  const [participant, setParticipant] = useState<Participant | null>(null);

  function handleSetParticipant(e: React.MouseEvent) {
    const index = userParticipants.findIndex(
      (a: RaceParticipant) => a.id === e.currentTarget.id
    );
    const participant = userParticipants[index];

    setParticipant(participant);
  }

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
        {raceParticipants.map((p: RaceParticipant, index: number) => (
          <div
            className={clsx(
              'flex flex-col gap-y-2 border-2 border-b border-gray-500 p-2 mx-2 items-center w-[200px]',
              p.participantId === participant?.id ? 'opacity-100' : 'opacity-50'
            )}
            key={p.id}
            id={p.participantId}
            onClick={handleSetParticipant}
          >
            <H5>{p.race.name}</H5>
            <H6 className="dark:text-blueGray-500">
              {t('Participant') + ' ' + (index + 1)}
            </H6>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row">
        <div className="flex-col w-full md:w-[50%] mt-8">
          <ParticipantForm participant={participant} />
        </div>
        <div className="w-full md:w-[50%] md:mt-0 md:pl-48">
          <DisplayCart cart={cart} event={event} />
        </div>
      </div>
    </Main>
  );
}

function ParticipantForm({ participant }: { participant: Participant | null }) {
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation('checkout');
  const genderOptions = [
    { value: '0', label: t('Female') },
    { value: '1', label: t('Male') },
    { value: '2', label: t('Other') }
  ];
  const shirtOptions = [
    { value: '0', label: 'XS' },
    { value: '1', label: 'S' },
    { value: '2', label: 'M' },
    { value: '3', label: 'L' },
    { value: '4', label: 'XL' },
    { value: '5', label: 'XXL' }
  ];

  return (
    <UploadForm
      method="post"
      className={clsx('w-full', participant ? 'opacity-100' : 'opacity-50')}
    >
      <div className="flex flex-col md:flex-row md:space-x-2">
        <FormField
          label={t('First Name')}
          id="first-name"
          error={actionData?.errors?.firstName}
        >
          <TextField name="first-name" placeholder={t('First Name')} />
        </FormField>

        <FormField
          label={t('Last Name')}
          id="last-name"
          error={actionData?.errors?.lastName}
        >
          <TextField name="last-name" placeholder={t('Last Name')} />
        </FormField>
      </div>

      <FormField label={t('Gender')} error={actionData?.errors?.gender}>
        <ComboBox name="gender" placeholder="" options={genderOptions} />
      </FormField>

      <div className="flex flex-col md:flex-row md:space-x-2">
        <FormField
          label={''}
          id="birthday"
          error={actionData?.errors?.birthday}
        >
          <BasicDatePicker
            label={t('Birthday')}
            name="birthday"
            date={new Date()}
          />
        </FormField>

        <FormField
          label={t('Phone Number')}
          id="phone-number"
          error={actionData?.errors?.phoneNumber}
        >
          <TextField
            type="number"
            name="phone-number"
            placeholder={t('Phone Number')}
          />
        </FormField>
      </div>

      <div className="flex flex-col md:flex-row md:space-x-2">
        <FormField label={t('CC')} id="CC" error={actionData?.errors?.cc}>
          <TextField type="number" name="cc" placeholder={t('CC')} />
        </FormField>

        <FormField
          label={t('National Federation Number')}
          id="federation-number"
          error={actionData?.errors?.federationNumber}
        >
          <TextField
            type="number"
            name="federation-number"
            placeholder={t('National Federation Number')}
          />
        </FormField>
      </div>

      <FormField label={t('Shirt Size')} error={actionData?.errors?.shirtSize}>
        <ComboBox name="shirt" placeholder="" options={shirtOptions} />
      </FormField>

      <FormField
        label={t('Nationality')}
        id="nationality"
        error={actionData?.errors?.nationality}
      >
        <TextField name="nationality" placeholder={t('Nationality')} />
      </FormField>

      <FormField
        label={t('Postal Code')}
        id="postal-code"
        error={actionData?.errors?.postalcode}
      >
        <TextField name="postal-code" placeholder={t('Postal Code')} />
      </FormField>

      {participant && (
        <input type="hidden" name="participantId" value={participant.id} />
      )}
      <Button
        type="submit"
        value={actions.update}
        name="actionId"
        disabled={!participant}
      >
        {t('Save')}
      </Button>
    </UploadForm>
  );
}
