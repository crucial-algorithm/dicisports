import { TrashIcon } from '@heroicons/react/24/outline';
import { useFetcher } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import HourOfDay from '~/components/HourOfDay';
import Button from '~/components/shared/Button';
import Dialog from '~/components/shared/Dialog';
import BasicDatePicker from '~/components/shared/form/DatePicker';
import FormField from '~/components/shared/form/FormField';
import { inputBaseClasses } from '~/components/shared/form/InputBase';
import TextField from '~/components/shared/form/TextField';
import type { Race } from '~/types';
import { hoursMinutesToTimeOfDay, timeOfDayToHoursMinutes } from '~/utils/misc';


type FormErrors = {
  name?: string;
  distance?: string;
  startTime?: string;
  elevationGain?: string;
  elevationLoss?: string;
  price?: string;
  priceEarlyBird?: string;
  validUntil?: string;
};

export default function RaceDialog(props: {
  isOpen: boolean;
  triggerModalClose: () => void;
  eventId: string;
  race?: Race;
  hash: number;
}) {
  const { t } = useTranslation('create-event-form');
  const { isOpen, triggerModalClose, eventId, race, hash } = props;
  const fetcher = useFetcher();
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadedGPX, setUploadedGPX] = useState<string | null>(null);
  const [deletedGPX, setDeletedGPX] = useState<boolean>(false);
  const [hour, minute] = timeOfDayToHoursMinutes(
    race?.startTime ? race.startTime : hoursMinutesToTimeOfDay(9, 0)
  );

  const name = useRef<HTMLInputElement | null>(null);
  const distance = useRef<HTMLInputElement | null>(null);
  const startTime = useRef<HTMLInputElement | null>(null);
  const elevationGain = useRef<HTMLInputElement | null>(null);
  const elevationLoss = useRef<HTMLInputElement | null>(null);
  const price = useRef<HTMLInputElement | null>(null);
  const priceEarlyBird = useRef<HTMLInputElement | null>(null);
  const validUntil = useRef<HTMLInputElement | null>(null);
  const raceDescription = useRef<HTMLTextAreaElement | null>(null);

  const close = useCallback(() => {
    setErrors({});
    triggerModalClose();
    setUploadedGPX(null);
    setDeletedGPX(false);
  }, [triggerModalClose]);

  function handleSubmit() {
    let hour: undefined | number = undefined;
    let minute: undefined | number = undefined;

    if (startTime.current?.value) {
      const [h, m] = startTime.current.value.split(':').map(Number);

      hour = h;
      minute = m;
    }

    const payload = {
      raceId: race?.id ? race.id : '',
      name: name.current?.value,
      distance: distance.current?.value,
      hour,
      minute,
      elevationGain: elevationGain.current?.value,
      elevationLoss: elevationLoss.current?.value,
      price: price.current?.value,
      priceEarlyBird: priceEarlyBird.current?.value,
      date: validUntil.current?.value,
      description: raceDescription.current?.value,
      deletedGPX,
      hash
    };

    if (inputEl.current?.files[0]) {
      if (race && race.id) {
        // @ts-ignore
        payload[`file/${race.id}`] = inputEl.current?.files[0];
      } else {
        // @ts-ignore
        payload.file = inputEl.current?.files[0];
      }
    }

    // Payload types error
    // @ts-ignore
    fetcher.submit(payload, {
      method: 'post',
      action: `/o/race/${eventId}/manage`,
      encType: 'multipart/form-data'
    });
  }

  function FileListItems(files: File[]) {
    const dt = new ClipboardEvent('').clipboardData || new DataTransfer();

    for (let i = 0, len = files.length; i < len; i++) {
      dt.items.add(files[i]);
    }

    return dt.files;
  }

  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: '.gpx',
    onDrop: (accepted) => {
      if (accepted.length === 0) {
        return;
      }
      const file: File = accepted[0] as File;

      if (!inputEl || !inputEl.current) {
        return;
      }

      // @ts-ignore
      inputEl.current.files = new FileListItems([file]);
      setUploadedGPX(file.name);
    }
  });
  const inputProps = getInputProps();
  // @ts-ignore
  const inputEl = inputProps.ref;

  function handleDeleteGPX() {
    setDeletedGPX(true);
    setUploadedGPX(null);
  }

  useEffect(() => {
    if (fetcher.type === 'actionReload' && fetcher.data.ok) {
      // reload & ok means success, since we return json({ ok: true })

      return close();
    }

    if (
      fetcher.type === 'done' &&
      fetcher.data?.errors &&
      fetcher.data?.hash === hash
    ) {
      return setErrors(fetcher.data.errors as FormErrors);
    }
  }, [fetcher, close, hash]);

  return (
    <Dialog
      className="md:w-8/12"
      isOpen={isOpen}
      onClose={close}
      title={t('Distance Modal')}
      data-cy="race-dialog"
      PrimaryAction={
        <Button
          type="button"
          onClick={handleSubmit}
          name="create-race-button"
        >
          {race?.id ? t('Update Distance') : t('Create Distance')}
        </Button>
      }
      SecondaryAction={
        <Button variant="secondary" type="button" onClick={close}>
          {t('Cancel')}
        </Button>
      }
    >
      <div className="p-4">

        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="raceId" value={race?.id} />
        <input type="hidden" name="hash" value={hash} />

        <FormField label={t('Race name')} error={errors?.name}>
          <TextField
            id="race-name"
            name="race-name"
            placeholder={t('Race Name Placeholder')}
            input={name}
            className="max-w-md"
            defaultValue={race?.name}
          />
        </FormField>

        <FormField
          label={t('Distance')}
          error={errors?.distance}
          className="w-full"
        >
          <TextField
            id="race-distance"
            name="race-distance"
            type="number"
            className="w-44"
            placeholder={t('Distance Placeholder')}
            input={distance}
            defaultValue={race?.distance}
          />
        </FormField>

        <FormField
          label={t('Start At')}
          id="race-time-of-day"
          className="w-80"
          error={errors?.startTime}
        >
          <HourOfDay hour={hour} minute={minute} input={startTime} />
        </FormField>

        <FormField label={t('D+')} error={errors?.elevationGain}>
          <TextField
            id="race-elevation-gain"
            name="elevationGain"
            type="number"
            className="w-56"
            placeholder={t('D+ Placeholder')}
            input={elevationGain}
            defaultValue={race?.elevationGain}
          />
        </FormField>
        <FormField label={t('D-')} error={errors?.elevationLoss}>
          <TextField
            id="race-elevation-loss"
            name="elevationLoss"
            type="number"
            className="w-56"
            placeholder={t('D- Placeholder')}
            input={elevationLoss}
            defaultValue={race?.elevationLoss as number}
          ></TextField>
        </FormField>

        <FormField label={t('Price')} error={errors?.price}>
          <TextField
            id="race-price"
            name="price"
            type="number"
            className="w-44"
            placeholder={t('Price Placeholder')}
            input={price}
            defaultValue={race?.price}
          ></TextField>
        </FormField>

        <div className="flex flex-wrap w-full">
          <FormField
            label={t('Price Early Bird')}
            error={errors?.priceEarlyBird}
            className="pr-3.5"
          >
            <TextField
              id="race-early-bird"
              name="priceEarlyBird"
              type="number"
              className="w-56"
              placeholder={t('Price Early Bird Placeholder')}
              input={priceEarlyBird}
              defaultValue={race?.priceEarlyBird as number}
            ></TextField>
          </FormField>

          <FormField
            label={t('Valid Until')}
            id="event-date"
            className="w-56 w-full"
            error={errors?.validUntil}
          >
            <BasicDatePicker
              label={''}
              name="race-date"
              date={race?.validUntil ? new Date(race.validUntil) : null}
              input={validUntil}
              className="w-full"
            />
          </FormField>
        </div>

        <FormField label={t('Description')}>
          <div className="mt-1 relative rounded-md shadow-sm">
              <textarea
                name="race-description"
                className={inputBaseClasses('p-10 max-w-lg')}
                placeholder={t('Race Description')}
                defaultValue={race?.raceDescription || ''}
                ref={raceDescription}
                rows={5}
                cols={50}
              />
          </div>
        </FormField>

        {(!race?.track || deletedGPX) && (
          <FormField label={t('GPX')}>
            <section
              className={clsx(
                'h-40 bg-gray-100 text-black placeholder-gray-500 text-lg font-medium',
                'dark:disabled:text-blueGray-500 dark:text-white dark:bg-gray-800',
                'object-cover object-left-top overflow-hidden',
                'flex content-center justify-center'
              )}
            >
              <div
                {...getRootProps({
                  className: 'h-80 w-full overflow-hidden'
                })}
              >
                <input {...inputProps} name="/file/gpx/" ref={inputEl} />
                <p className="h-40 w-full flex items-center justify-center">
                  {t('GPX Dropzone')}
                </p>
              </div>
            </section>
          </FormField>
        )}
        {uploadedGPX && (
          <div
            className={clsx(
              'text-md font-extrabold dark:text-white mt-4 ml-4'
            )}
          >
            {uploadedGPX}
          </div>
        )}

        {race?.track && !deletedGPX && (
          <div className="relative flex mb-4 justify-between items-center flex-row p-4">
            <div className="flex flex-row items-center">
              <div className={clsx('text-lg font-extrabold dark:text-white')}>
                {t('Download GPX File')}
              </div>
            </div>
            <div>
              <a
                href={`/o/race/gpx/${race?.id}`}
                target="_blank"
                rel="noreferrer"
                className="group relative inline-flex ml-14 dark:text-blueGray-500"
                download
              >
                {/*couldn't find import of icon*/}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
              </a>
              <button
                className="group relative inline-flex ml-6 dark:text-blueGray-500"
                type="button"
                onClick={handleDeleteGPX}
              >
                <TrashIcon className="md:h-6 w-6 m-0 inline-block"></TrashIcon>
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
