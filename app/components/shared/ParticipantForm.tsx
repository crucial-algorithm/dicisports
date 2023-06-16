import type { FetcherWithComponents } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Combobox } from '@headlessui/react';

import { XMarkIcon } from '@heroicons/react/24/outline';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import type { TFunction } from 'i18next';

import { CheckoutInfoActions } from '~/action.keys';

import Button from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';
import ComboBox from '~/components/shared/form/ComboBox';
import BasicDatePicker from '~/components/shared/form/DatePicker';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import countries from '~/server/db/countries.json';
import type { EventTeam, Language, Participant, ShirtSize } from '~/types';
import { FetcherForm, FormContext } from '~/components/shared/form/UploadForm';
import { useTheme } from '~/utils/theme-provider';

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
  children,
  eventTeams
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
  eventTeams: EventTeam[] | null;
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

      <div className="flex flex-col md:flex-row md:gap-x-2">
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

        <FormField label={t('Team')}>
          <TeamAutoComplete t={t} dbTeams={eventTeams} defaultValue={'Pernetas'}/>
        </FormField>
      </div>

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
                : new Date(Date.now() - 63113904 * 10000)
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
            placeholder={t('Required')}
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
        <input
          type="hidden"
          name="selected-participant-id"
          value={selectedParticipant.id}
        />
      )}

      {children}

      <input type="hidden" name="hash" value={hash} />
      <input type="hidden" name="raceId" value={raceId as string} />
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
            variant={selectedParticipant ? 'secondary' : 'primary'}
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
              variant="primary"
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

function TeamAutoComplete({ dbTeams, t, defaultValue }: { dbTeams: EventTeam[] | null; t: TFunction; defaultValue?: string }) {
  const [theme] = useTheme();
  const inDarkMode = theme === 'dark';
  const formProps = useContext(FormContext);

  const [query, setQuery] = useState('');
  const [teams, setTeams] = useState<string[]>(
    dbTeams ? dbTeams.map((d) => d.name) : []
  );
  const [activeTeam, setActiveTeam] = useState<string | null>(defaultValue || null);

  if (formProps.readOnly) {
    return (
        <div className="font-medium dark:text-white">
          {teams.find((t) => t === defaultValue)}
        </div>
    );
  }

  const filteredTeams =
    query === ''
      ? teams
      : teams.filter((t) => t.toLowerCase().includes(query.toLowerCase()));

  function handleOnSelectTeam(team: string) {
    setActiveTeam(team);

    if (!teams.includes(team)) {
      setTeams((current) => [...current, team]);
    }
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
  }

  function handleOptionStyle({ active }: { active: boolean }) {
    return clsx('relative cursor-default select-none py-2 pl-10 pr-4', {
      'bg-gray-300 text-gray-700': active && !inDarkMode,
      'bg-gray-600 text-gray-100': active && inDarkMode
    });
  }

  function handleRemoveSelectedTeam() {
    setActiveTeam(null);
  }

  return (
    <div className="flex flex-row items-center gap-x-2">
      <Combobox
        value={activeTeam}
        onChange={handleOnSelectTeam}
        as="div"
        className="w-full md:w-72"
      >
        <div className="relative mt-1">
          <div className="z-100">
            <div>
              <Combobox.Input
                name="team-name"
                className="input-text"
                onChange={handleSearch}
                autoComplete="off"
              />
            </div>

            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          <Combobox.Options
            className={clsx(
              'absolute w-full overflow-auto z-10 mt-1 max-h-60 py-1',
              'rounded-md shadow-lg',
              'ring-1 ring-black ring-opacity-5',
              'focus:outline-none sm:text-sm',
              {
                'bg-gray-800 text-gray-100': inDarkMode,
                'bg-white text-base': !inDarkMode
              }
            )}
          >
            {filteredTeams.length === 0 && query !== '' && (
              <Combobox.Option
                value={query}
                className={clsx(
                  'relative cursor-default select-none py-2 px-4',
                  {
                    'text-gray-700': !inDarkMode,
                    'text-gray-100': inDarkMode
                  }
                )}
              >
                {t('Create team: X', { team: query })}
              </Combobox.Option>
            )}
            {filteredTeams.map((team) => {
              return (
                <Combobox.Option
                  key={team}
                  value={team}
                  className={handleOptionStyle}
                >
                  {team}
                </Combobox.Option>
              );
            })}
          </Combobox.Options>
        </div>
      </Combobox>
      {activeTeam && (
        <button
          name="remove-schedule"
          type="button"
          onClick={handleRemoveSelectedTeam}
          className="dark:text-blueGray-500"
        >
          <XMarkIcon className="h-4 w-4 m-0 inline-block" />
        </button>
      )}
    </div>
  );
}
