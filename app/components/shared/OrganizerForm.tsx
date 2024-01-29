import * as React from 'react';
import { Link } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import type { Organizer } from '@prisma/client';

import UploadForm from '~/components/shared/form/UploadForm';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import UploadImage from '~/components/shared/form/UploadImage';
import InputError from '~/components/shared/form/InputError';
import ButtonGroup from '~/components/shared/ButtonGroup';
import Button, { ButtonLink } from '~/components/shared/Button';
import type { OrganizerType } from '~/types';
import type { Language } from '~/types';
import ComboBox from '~/components/shared/form/ComboBox';

type FormErrors = {
  name?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  description?: string;
  logo?: string;
  terms?: string;
  taxNumber?: string;
  contactName?: string;
};

export default function OrganizerForm({
  organizer,
  organizerTypes,
  errors,
  readOnly = false
}: {
  organizer: Organizer;
  organizerTypes: OrganizerType[];
  readOnly?: boolean;
  errors?: FormErrors;
}) {
  const { t, i18n } = useTranslation('organizer-form');
  const language = i18n.language as Language;

  return (
    <UploadForm method="post" readOnly={readOnly}>
      <div className="flex flex-col md:grid md:grid-cols-2 md:grid-flow-col md:gap-4">
        <div>
          <FormField
            data-cy="name"
            label={t('Name')}
            error={errors?.name}
            description={!readOnly && t('Organizer display field')}
          >
            <TextField name="name" defaultValue={organizer?.name || ''} />
          </FormField>

          <FormField label={t('Organizer Type')}>
            <ComboBox
              name="type"
              placeholder={t('Organizer Type Placeholder')}
              options={organizerTypes.map((o) => {
                return { value: o.id, label: o.name };
              })}
              lang={language}
              defaultValue={
                organizer && organizer.typeId ? organizer.typeId : 1
              }
            />
          </FormField>

          <FormField data-cy="email" label={t('E-mail')} error={errors?.email}>
            <TextField name="email" defaultValue={organizer?.email || ''} />
          </FormField>

          <div className="flex flex-col lg:flex-row lg:gap-x-2">
            <FormField
              label={t('Phone Number')}
              error={errors?.phoneNumber}
              className="w-full md:w-1/2"
            >
              <TextField
                name="phone-number"
                type="number"
                placeholder={t('Phone Number Placeholder')}
                defaultValue={organizer?.phoneNumber || ''}
              />
            </FormField>

            <FormField
              data-cy="tax-number"
              label={t('Tax Number')}
              className="w-full md:w-1/2"
              error={errors?.taxNumber}
            >
              <TextField
                name="tax-number"
                type="number"
                defaultValue={organizer?.taxNumber || ''}
              />
            </FormField>
          </div>

          <FormField label={t('Contact Name')} error={errors?.contactName}>
            <TextField
              name="contact-name"
              defaultValue={organizer?.contactName || ''}
            />
          </FormField>

          <FormField
            data-cy="address"
            label={t('Address')}
            error={errors?.address}
          >
            <TextField name="address" defaultValue={organizer?.address || ''} />
          </FormField>

          <div className="flex flex-col lg:flex-row lg:gap-x-2">
            <FormField
              data-cy="postal-code"
              label={t('Postal Code')}
              className="w-1/2 md:w-full"
              error={errors?.postalCode}
            >
              <TextField
                name="postal-code"
                defaultValue={organizer?.postalCode || ''}
              />
            </FormField>

            <FormField
              data-cy="city"
              label={t('City')}
              className="w-full md:w-1/2"
              error={errors?.city}
            >
              <TextField name="city" defaultValue={organizer?.city || ''} />
            </FormField>
          </div>

          <FormField
            label={t('Description')}
            error={errors?.description}
            description={!readOnly && t('Organizer display field')}
          >
            <div className="mt-1 relative rounded-md shadow-sm">
              {readOnly ? (
                <div className="font-medium dark:text-white">
                  {organizer?.description}
                </div>
              ) : (
                <textarea
                  name="description"
                  className="input-text p-10"
                  placeholder={t('Profile Description')}
                  rows={5}
                  cols={50}
                  defaultValue={organizer?.description || ''}
                />
              )}
            </div>
          </FormField>
        </div>
        <div className="col-span-3">
          <FormField
            label={t('Profile Photo')}
            error={errors?.logo}
            description={!readOnly && t('Organizer display field')}
          >
            <UploadImage
              index={0}
              label={t('Hint For Profile Picture')}
              defaultValue={organizer?.logo || ''}
            />
          </FormField>
        </div>
      </div>
      {!readOnly && (
        <>
          {!organizer && (
            <>
              <div className="flex items-center mb-8">
                <input
                  name="terms"
                  type="checkbox"
                  className="w-4 h-4 text-indigo-500 bg-gray-100 rounded border-gray-300 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                />
                <label
                  className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                  htmlFor="terms"
                >
                  {t('Read and Accepted')}
                  <Link
                    target="_blank"
                    to="/organizers-terms"
                    data-cy="terms-link"
                  >
                    {t('Terms and Conditions')}
                  </Link>
                </label>
              </div>

              <InputError id="terms-error" className="mb-2">
                {errors?.terms}
              </InputError>
            </>
          )}
          <ButtonGroup>
            <ButtonLink
              type="button"
              variant="secondary"
              to={!organizer || organizer?.status === 'PENDING' ? '/' : '/o'}
            >
              {t('Cancel')}
            </ButtonLink>

            <Button type="submit" name="save-profile">
              {t('Save')}
            </Button>
          </ButtonGroup>
        </>
      )}
    </UploadForm>
  );
}
