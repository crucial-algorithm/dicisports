import * as React from 'react';
import type { ChangeEvent } from 'react';
import { useState } from 'react';
import clsx from 'clsx';
import { Status } from '@prisma/client';
import type { TFunction } from 'i18next';

import BasicDatePicker from '~/components/shared/form/DatePicker';

import FormField from '~/components/shared/form/FormField';

import InputBase from '~/components/shared/form/InputBase';
import TextField from '~/components/shared/form/TextField';

import type { EventWithRacesDifficultiesAndDocuments } from '~/server/db/events.server';

export type PickBookingSystemOptions = {
  name: string;
  event: EventWithRacesDifficultiesAndDocuments;
  t: TFunction; // ns: create-event-form;
  isPublished: boolean;
  hasRegistrations: boolean;
  errorBibStartingNumber?: string;
  errorBookingStopsAt?: string;
  errorExternalBookingUrl?: string;
  eventDate: Date | null;
};

const Values = {
  External: 'external',
  Internal: 'internal'
};

export default function PickBookingSystem({
  name,
  t,
  event,
  isPublished,
  hasRegistrations,
  eventDate,
  errorBibStartingNumber,
  errorBookingStopsAt,
  errorExternalBookingUrl
}: PickBookingSystemOptions) {
  const isNewEvent = event?.status === Status.auto;
  const isInternalDisabled = isNewEvent;

  const [state, setState] = useState<{
    value: string;
    disabled: boolean;
  }>({
    value:
      isInternalDisabled || event?.useExternalBooking
        ? Values.External
        : Values.Internal,
    disabled: isInternalDisabled ? false : !event?.useExternalBooking
  });

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    setState({
      value: e.target.value,
      disabled: e.target.value === 'internal'
    });
  }

  return (
    <>
      <FormField
        label={t('How Is Booking Going To Be Managed')}
        error={errorExternalBookingUrl}
      >
        <div className="flex items-center">
          <input
            id={`${name}-internal`}
            name={name}
            type="radio"
            className={clsx(
              'focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300',
              isInternalDisabled && 'cursor-not-allowed opacity-50'
            )}
            defaultChecked={!isInternalDisabled && !event?.useExternalBooking}
            onChange={onChange}
            value="internal"
            disabled={isInternalDisabled}
          />
          <label
            htmlFor={`${name}-internal`}
            className={clsx(
              'ml-3 block text-sm font-medium',
              isInternalDisabled
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700'
            )}
          >
            {t('Manage Booking in Platform')}
          </label>
        </div>
        <div className="flex items-center">
          <input
            id={`${name}-external`}
            name={name}
            type="radio"
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
            defaultChecked={
              isInternalDisabled || event?.useExternalBooking === true
            }
            onChange={onChange}
            value="external"
          />
          <label
            htmlFor={`${name}-external`}
            className="ml-3 block text-sm font-medium text-gray-700"
          >
            {t('Manage Booking Externally')}
          </label>
        </div>
      </FormField>

      <FormField label={t('Link to External Booking URL')}>
        <InputBase
          type="text"
          name={`${name}-url`}
          id="external-url"
          autoComplete="email"
          disabled={state.disabled}
          defaultValue={event?.externalBookingUrl || ''}
        />
      </FormField>

      <div className="flex flex-col flex-wrap md:flex-row">
        <FormField
          label={t('Bib Starting Number')}
          id="bib-number"
          description={t('Bib Starting Number Description')}
          error={errorBibStartingNumber}
          className="w-full md:basis-1/3 md:pr-4"
        >
          <TextField
            name="bib-number"
            type="number"
            placeholder={t('Bib number placeholder')}
            defaultValue={event.bibStartingNumber || 1}
            className="w-full md:w-48"
            disabled={
              (isPublished && hasRegistrations) ||
              state.value === Values.External
            }
          />
        </FormField>

        <FormField
          label={t('Booking stops at')}
          description={t('Booking stops at Description')}
          error={errorBookingStopsAt}
          className="w-full md:basis-1/3 md:pr-4"
        >
          <BasicDatePicker
            name="booking-stops-at"
            date={
              event.bookingStopsAt ? new Date(event.bookingStopsAt) : undefined
            }
            maxDate={eventDate ? new Date(eventDate.getTime() - 86400000) : undefined}
            viewDate={
              event.bookingStopsAt ? new Date(event.bookingStopsAt) : eventDate
            }
            key={`bsa-${
              eventDate ? new Date(eventDate).toISOString() : Date.now()
            }`}
            disabled={state.value === Values.External}
          />
        </FormField>
      </div>
    </>
  );
}
