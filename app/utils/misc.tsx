import { json } from '@remix-run/node';

import type { UICartRow } from '~/types';

import type { Language, NonNullProperties, TranslationObject } from '~/types';

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

function bookingAmount(
  cart: UICartRow[],
  discountValue?: number,
  fixedDiscount: boolean = false
) {
  const total = cart.reduce((total, { qty, price }) => total + qty * price, 0);
  
  return discountValue
    ? handleApplyDiscount(total, discountValue, fixedDiscount)
    : total;
}

function handleApplyDiscount(
  total: number,
  discountValue: number,
  fixedDiscount: boolean
): number {

  return fixedDiscount
    ? total - discountValue
    : total - total * (discountValue / 1000 / 100);
}

// Function that validates identity card according to Autenticação.gov
// Check /docs/pt_idcard_validation.pdf for more information
function validateIdentityCard(identityCard: string): boolean {
  const mapping: { [key: string]: number } = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    A: 10,
    B: 11,
    C: 12,
    D: 13,
    E: 14,
    F: 15,
    G: 16,
    H: 17,
    I: 18,
    J: 19,
    K: 20,
    L: 21,
    M: 22,
    N: 23,
    O: 24,
    P: 25,
    Q: 26,
    R: 27,
    S: 28,
    T: 29,
    U: 30,
    V: 31,
    W: 32,
    X: 33,
    Y: 34,
    Z: 35
  };
  let oddDigit: boolean = false;
  const formattedIdentityCard = identityCard.split('-').join('');

  if (formattedIdentityCard.length !== 12) {
    return false;
  }

  const sum = Array.from(formattedIdentityCard)
    .reverse()
    .reduce((total, digit) => {
      let value = mapping[digit.toUpperCase()];

      if (oddDigit) {
        value *= 2;

        if (value > 9) {
          value -= 9;
        }
      }

      oddDigit = !oddDigit;
      return total + value;
    }, 0);

  return sum % 10 === 0;
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
  getLocalizedText,
  generateSlug,
  bookingAmount,
  validateIdentityCard
};
