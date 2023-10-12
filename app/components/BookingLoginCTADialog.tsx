import { useEffect, useRef } from 'react';
import * as React from 'react';

import { Link } from '@remix-run/react';

import type { TFunction } from 'i18next';

import Button from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import { H2, H6 } from '~/components/shared/typography';
import { maintainBookingLocalStorageMetadData } from '~/utils/misc';

export default function BookingLoginCTADialog({
  bookingId,
  t
}: {
  bookingId: string;
  t: TFunction
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { read, write } = maintainBookingLocalStorageMetadData(bookingId);

  useEffect(() => {
    const localMetaData = read();

    // @ts-ignore: in cypress, without closing it 1st, showModal will throw an error
    dialog.current?.close();

    // @ts-ignore
    !localMetaData.loginCTASeen && dialog.current?.showModal();

  }, [bookingId, dialog, read]);

  function handleCloseCTAToLoginDialog() {
    // @ts-ignore
    dialog.current?.close();

    write('loginCTASeen', true);
  }

  return (
    <dialog
      ref={dialog}
      className="relative w-full h-screen md:w-144 md:h-fit md:h-fit rounded border-dashed shadow animate-fade-in dark:bg-gray-800"
    >
      <div className="flex flex-col h-full justify-between p-6">
        <H2 className="mb-2 text-secondary">
          {t('Suggest Login Dialog - Title')}
        </H2>
        <H6 variant="secondary" as="p" className="text-white mb-8">
          {t('Suggest Login Dialog - Why should you login')}
        </H6>
        <form action={`/login?a=checkout&b=${bookingId}`} method="POST">
          <FormField label={t('Suggest Login Dialog - Email Field')} id="email">
            <TextField
              id="email"
              name="email"
              className="w-full text-sm h-14 md:h-20 dark:bg-gray-700"
              autoComplete="off"
              defaultValue=""
            />
          </FormField>
          <FormField
            label={t('Suggest Login Dialog - Password Field')}
            id="password"
          >
            <TextField
              id="password"
              type="password"
              name="password"
              className="w-full text-sm h-14 md:text-2xl md:h-20 dark:bg-gray-700"
              autoComplete="current-password"
              defaultValue=""
            />
          </FormField>
          <ButtonGroup>
            <Button type="submit" name="login">
              {t('Suggest Login Dialog - Login Button')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseCTAToLoginDialog}
              id="checkout-anonymously"
            >
              {t('Suggest Login Dialog - Skip Login Button')}
            </Button>
          </ButtonGroup>

          <p className="dark:text-blueGray-500 text-gray-500 mt-8">
            {t("Suggest Login Dialog - Don't have an account")} &nbsp;
            <Link to={`/signup?a=checkout&b=${bookingId}`} id="create-account">
              {t("Suggest Login Dialog - Don't have an account CTA")}
            </Link>
          </p>

          <p className="dark:text-blueGray-500 text-gray-500 mt-2">
            {t('Suggest Login Dialog - Recover Password')} &nbsp;
            <Link to="/recover">
              {t('Suggest Login Dialog - Recover Password CTA')}
            </Link>
          </p>
        </form>
      </div>
    </dialog>
  );
}
