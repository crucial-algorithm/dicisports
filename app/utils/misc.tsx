import React, { useState } from 'react';

import { json } from 'remix';

import { useTranslation } from 'react-i18next';

import type {
  DaysOfWeek,
  Language,
  NonNullProperties,
  TranslationObject
} from '~/types';
import ComboBox from '~/components/shared/form/ComboBox';

function getDomainUrl(request: Request) {
  const host =
    request.headers.get('X-Forwarded-Host') ?? request.headers.get('host');

  if (!host) {
    throw new Error('>>Error<<: Could not determine domain URL');
  }
  const protocol = host.includes('localhost') ? 'http' : 'https';

  return `${protocol}://${host}`;
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '>>Error<<: Unknown Error';
}

function getErrorStack(error: unknown) {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.stack;
  }
  return '>>Error<<: Unknown Error';
}

function getNonNull<Type extends Record<string, null | undefined | unknown>>(
  obj: Type
): NonNullProperties<Type> {
  for (const [key, val] of Object.entries(obj)) {
    assertNonNull(val, `The value of ${key} is null but it should not be.`);
  }
  return obj as NonNullProperties<Type>;
}

function assertNonNull<PossibleNullType>(
  possibleNull: PossibleNullType,
  errorMessage: string
): asserts possibleNull is Exclude<PossibleNullType, null | undefined> {
  if (possibleNull == null) {
    throw new Error(errorMessage);
  }
}

function removeTrailingSlash(s: string) {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

function typedBoolean<T>(
  value: T
): value is Exclude<T, '' | 0 | false | null | undefined> {
  return Boolean(value);
}

function badRequest<T>(data: T): Response {
  return json(data, { status: 400 });
}

function getNullIfEmpty(value: string): string | null {
  return value ? value : null;
}

function timeOfDayToHoursMinutes(value: number): [number, number] {
  const hours = Math.floor(value / 100);
  const minutes = value % 100;

  return [hours, minutes];
}

function hoursMinutesToTimeOfDay(hours: number, minutes: number): number {
  return hours * 100 + minutes;
}

function displayTimeOfDay(value: number): string {
  const [hours, minutes] = timeOfDayToHoursMinutes(value);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0'
  )}`;
}

function PeekDayOfWeek(props: {
  name: string;
  id: string;
  defaultValue?: DaysOfWeek | null;
  addAll?: boolean;
  input?: React.RefObject<HTMLInputElement>;
  onChange?: (value: string | number) => void;
}) {
  const { t, i18n } = useTranslation('common');
  const { id, name, defaultValue, addAll, input, onChange } = props;
  const [day, setDay] = useState<string>('');
  const options = [
    { value: 6, label: t('Sunday') },
    { value: 0, label: t('Monday') },
    { value: 1, label: t('Tuesday') },
    { value: 2, label: t('Wednesday') },
    { value: 3, label: t('Thursday') },
    { value: 4, label: t('Friday') },
    { value: 5, label: t('Saturday') }
  ];

  function handleChangeDay(value: string | number) {
    setDay(String(value));

    if (onChange) {
      onChange(value);
    }
  }

  return (
    <>
      <ComboBox
        name={name}
        onChange={handleChangeDay}
        lang={i18n.language as Language}
        id={id}
        placeholder={addAll ? t('Any Day Of week') : ''}
        defaultValue={defaultValue === null ? -1 : defaultValue}
        options={options}
      />
      <input type="hidden" name="value" value={day} ref={input} />
    </>
  );
}

function getLocalizedText(language: Language, value?: TranslationObject) {
  if (!value) {
    return '';
  }
  return value[language];
}

function generateSlug(str: string) {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  const from = 'àáäâèéëêìíïîòóöôùúüûñç·/_,:;';
  const to = 'aaaaeeeeiiiioooouuuunc------';

  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return str;
}

export {
  getDomainUrl,
  getErrorMessage,
  getErrorStack,
  getNonNull,
  removeTrailingSlash,
  typedBoolean,
  badRequest,
  getNullIfEmpty,
  displayTimeOfDay,
  timeOfDayToHoursMinutes,
  hoursMinutesToTimeOfDay,
  PeekDayOfWeek,
  getLocalizedText,
  generateSlug
};
