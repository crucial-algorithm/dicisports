import type { LoaderFunction } from 'remix';
import { json } from 'remix';
import * as React from 'react';
import { useState } from 'react';

import { useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import DisplayDate from '~/components/shared/DIsplayDate';

import { getClientSession } from '~/server/auth/client.server';
import {
  findUserParticipants,
  findUserRaceParticipants,
  findUserSavedParticipants,
  getUserCheckoutRaces
} from '~/server/db/checkout.server';
import Main from '~/components/shared/Main';
import { findEvent } from '~/server/db/events.server';
import { H2, H5, H6 } from '~/components/shared/typography';

import type { Cart, Event, Participant, RaceParticipant } from '~/types';
import { DisplayCart } from '~/routes/checkout/tickets.$eventId';
import UploadForm from '~/components/shared/form/UploadForm';
import TextField from '~/components/shared/form/TextField';
import FormField from '~/components/shared/form/FormField';

import ComboBox from '~/components/shared/form/ComboBox';
import BasicDatePicker from '~/components/shared/form/DatePicker';
import Button from '~/components/shared/Button';

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
        <FormField label={t('First Name')} id="first-name">
          <TextField name="first-name" placeholder={t('First Name')} />
        </FormField>

        <FormField label={t('Last Name')} id="last-name">
          <TextField name="last-name" placeholder={t('Last Name')} />
        </FormField>
      </div>

      <FormField label={t('Gender')}>
        <ComboBox name="gender" placeholder="" options={genderOptions} />
      </FormField>

      <div className="flex flex-col md:flex-row md:space-x-2">
        <FormField label={''} id="birthday">
          <BasicDatePicker
            label={t('Birthday')}
            name="birthday"
            date={new Date()}
          />
        </FormField>

        <FormField label={t('Phone Number')} id="phone-number">
          <TextField
            type="number"
            name="phone-number"
            placeholder={t('Phone Number')}
          />
        </FormField>
      </div>

      <div className="flex flex-col md:flex-row md:space-x-2">
        <FormField label={t('CC')} id="CC">
          <TextField type="number" name="cc" placeholder={t('CC')} />
        </FormField>

        <FormField
          label={t('National Federation Number')}
          id="federation-number"
        >
          <TextField
            type="number"
            name="federation-number"
            placeholder={t('National Federation Number')}
          />
        </FormField>
      </div>

      <FormField label={t('Shirt Size')}>
        <ComboBox name="shirt" placeholder="" options={shirtOptions} />
      </FormField>

      <FormField label={t('Nationality')} id="nationality">
        <TextField name="nationality" placeholder={t('Nationality')} />
      </FormField>

      <FormField label={t('Postal Code')} id="postal-code">
        <TextField name="postal-code" placeholder={t('Postal Code')} />
      </FormField>

      {participant && (
        <input type="hidden" name="participantId" value={participant.id} />
      )}
      <Button value={actions.update} name="actionId" disabled={!participant}>
        {t('Save')}
      </Button>
    </UploadForm>
  );
}
