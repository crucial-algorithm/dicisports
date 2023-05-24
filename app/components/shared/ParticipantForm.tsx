import type { FetcherWithComponents } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { CheckoutInfoActions } from '~/action.keys';

import Button from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';
import ComboBox from '~/components/shared/form/ComboBox';
import BasicDatePicker from '~/components/shared/form/DatePicker';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import countries from '~/server/db/countries.json';
import type { Language, Participant, ShirtSize } from '~/types';
import { FetcherForm } from '~/components/shared/form/UploadForm';

export default function ParticipantForm({
  participant,
  hash,
  errors,
  userSavedParticipants,
  raceId,
  fetcher,
  selectedParticipant,
  setSelectedParticipant,
  shirtSizes,
  resetForm,
  isSingleParticipant,
  isReadOnly,
  children
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
  isSingleParticipant: boolean;
  isReadOnly: boolean;
} & React.ComponentProps<'div'>) {
  const { t, i18n } = useTranslation('checkout');
  const language = i18n.language as Language;

  const genderOptions = [
    { value: 'F', label: t('Female') },
    { value: 'M', label: t('Male') }
  ];

  return (
    <FetcherForm
      TheForm={fetcher.Form}
      method="post"
      className={clsx('w-full', {
        'opacity-100': participant,
        'opacity-50': !participant
      })}
      key={hash}
      readOnly={isReadOnly}
    >
      {!isReadOnly &&
        participant &&
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
      <div
        className={clsx('flex flex-col md:flex-row', {
          'md:space-x-12': isReadOnly,
          'md:space-x-2': !isReadOnly
        })}
      >
        <FormField
          label={t('First Name')}
          id="first-name"
          error={errors?.firstName}
          dataCy="firstName"
        >
          <TextField
            data-cy="first-name"
            name="first-name"
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
            defaultValue={
              (selectedParticipant?.lastName as string) ||
              (participant?.lastName as string)
            }
          />
        </FormField>
      </div>

      <FormField
        label={t('Gender')}
        error={errors?.gender}
        dataCy="gender"
        className="w-48"
      >
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

      <div
        className={clsx('flex flex-col md:flex-row', {
          'md:space-x-9': isReadOnly,
          'md:space-x-2': !isReadOnly
        })}
      >
        <FormField
          label={t('Birthdate')}
          id="birthdate"
          error={errors?.birthdate}
          dataCy="birthdate"
        >
          <BasicDatePicker
            name="birthdate"
            date={
              selectedParticipant?.birthdate
                ? new Date(selectedParticipant.birthdate)
                : participant?.birthdate
                ? new Date(participant.birthdate)
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

      <div
        className={clsx('flex flex-col md:flex-row', {
          'md:space-x-12': isReadOnly,
          'md:space-x-2': !isReadOnly
        })}
      >
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
        className="w-48"
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
        className="w-80"
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
        className="w-56"
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

      {children}

      <input type="hidden" name="hash" value={hash} />
      {!isReadOnly && (
        <ButtonGroup>
          <Button type="button" variant="secondary" onClick={resetForm}>
            {t('Reset')}
          </Button>
          <Button
            type="submit"
            value={
              isSingleParticipant
                ? CheckoutInfoActions.updateAndCheckout
                : CheckoutInfoActions.update
            }
            name="actionId"
            disabled={!participant}
            id="save-button"
            variant="secondary"
          >
            {t('Save')}
          </Button>
          {selectedParticipant && (
            <Button
              type="submit"
              value={CheckoutInfoActions.updateAndSave}
              name="actionId"
              disabled={!participant}
              id="save-update-button"
            >
              {t('Save and Update', {
                first: selectedParticipant.firstName,
                last: selectedParticipant.lastName
              })}
            </Button>
          )}
        </ButtonGroup>
      )}
    </FetcherForm>
  );
}

export type FormErrors = {
  firstName?: string;
  lastName?: string;
  gender?: string;
  birthdate?: string;
  phoneNumber?: string;
  identityCard?: string;
  federationNumber?: string;
  shirtSize?: string;
  nationality?: string;
  postalCode?: string;
  selectedParticipant?: string;
  missingFilledParticipants?: string;
  submit?: string;
  terms?: string;
  regulation?: string;
};
