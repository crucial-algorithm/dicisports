import type { LoaderFunction } from 'remix';
import { json } from 'remix';
import * as React from 'react';

import { useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';

import DisplayDate from '~/components/shared/DIsplayDate';

import { getClientSession } from '~/server/auth/client.server';
import { getUserCheckoutRaces } from '~/server/db/checkout.server';
import Main from '~/components/shared/Main';
import { findEvent } from '~/server/db/events.server';
import { H2, H6 } from '~/components/shared/typography';

import type { Cart, Event } from '~/types';
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
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const eventId = params.eventId as string;
  const clientSession = await getClientSession(request);
  const clientId = clientSession.getClientId();

  const event = await findEvent(eventId);
  const cart = await getUserCheckoutRaces(clientId, eventId);

  return json({
    event,
    cart
  });
};

export default function CheckoutInfoRoute() {
  const { event, cart } = useLoaderData<LoaderData>();

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
      <div className="flex flex-col md:flex-row">
        <div className="flex-col w-full md:w-[50%] mt-8">
          <ParticipantForm />
        </div>
        <div className="w-full mt-8 md:w-[50%] md:mt-0 md:pl-48">
          <DisplayCart cart={cart} event={event} />
        </div>
      </div>
    </Main>
  );
}

function ParticipantForm() {
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
    <UploadForm method="post" className="w-full">
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

      <Button>{t('Save')}</Button>
    </UploadForm>
  );
}
