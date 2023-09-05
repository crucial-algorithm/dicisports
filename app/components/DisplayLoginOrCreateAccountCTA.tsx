import * as React from 'react';

import { Link } from '@remix-run/react';

import type { TFunction } from 'i18next';
import clsx from 'clsx';

import { H6 } from '~/components/shared/typography';

export default function LoginOrCreateAccountCTA({
  t,
  bookingId,
  cta,
  className,
  subHeaderText
}: {
  t: TFunction;
  bookingId: string;
  cta: string;
  className?: string;
  subHeaderText?: string;
}) {
  return (
    <div className="mb-8">
      <p
        className={clsx(
          'dark:text-white text-black text-lg font-medium',
          className
        )}
      >
        {cta} &nbsp;
        <Link
          to={`/login?a=checkout&b=${bookingId}`}
          data-cy="authenticate-login"
        >
          {t('Login')}
        </Link>
        &nbsp; {t('Or')} &nbsp;
        <Link
          to={`/signup?a=checkout&b=${bookingId}`}
          data-cy="authenticate-signup"
        >
          {t('Create account')}
        </Link>
      </p>
      <H6 variant="secondary">{subHeaderText}</H6>
    </div>
  );
}
