import type { Event } from '@prisma/client';
import { CheckoutStatus } from '@prisma/client';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData
} from '@remix-run/react';
import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z, ZodError } from 'zod';

import Button from '~/components/shared/Button';
import DisplayCart from '~/components/shared/DisplayCart';
import DisplayDate from '~/components/shared/DIsplayDate';
import TextField from '~/components/shared/form/TextField';
import Main from '~/components/shared/Main';
import { H2, H4, H6 } from '~/components/shared/typography';

import { getClientSession } from '~/server/auth/client.server';
import { getUser } from '~/server/auth/session.server';
import { findBookingById, findBookingCart } from '~/server/db/booking.server';
import { findEvent } from '~/server/db/events.server';
import { findUserEventRaceParticipants } from '~/server/db/participant.server';
import type { Booking, KCDHandle, UICartRow } from '~/types';
import { badRequest, getDomainUrl } from '~/utils/misc';
import { sendBookingConfirmationEmail } from '~/server/email.server';
import i18n from '~/server/i18n.server';
import InputError from '~/components/shared/form/InputError';
import FormField from '~/components/shared/form/FormField';
import { findOrganizer } from '~/server/db/organizer.server';
import {
  addEmailToMailingList,
  findMailingListEnrolledEmail
} from '~/server/db/mailingList.server';

type LoaderData = {
  registration: Booking;
  event: Event;
  cart: UICartRow;
  isAuth: boolean;
  bookingId: string;
  organizerName: string;
  appliedDiscount: string | null;
};

type ActionData = {
  fields: {
    email: string;
  };
  errors: {
    email?: string;
    submit?: string;
  };
  successMessage: string | null;
};

export const handle: KCDHandle & { id: string; i18n: string[] } = {
  id: 'payment-confirmed',
  i18n: ['checkout']
};

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, ['checkout']);
  const form = await request.formData();

  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const bookingId = params.bookingId as string;

  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const booking = await findBookingById(bookingId);

  if (!booking) {
    return badRequest({
      error: t('No Booking')
    });
  }

  const eventId = booking.eventId;
  const event = await findEvent(eventId);

  if (!event) {
    return redirect('/');
  }

  const domainUrl = getDomainUrl(request);
  const cart = await findBookingCart(clientId, eventId);
  const email = form.get('email') as string;
  const enrollInMailingList: boolean =
    (form.get('add-to-mail-list') as string) === 'on';

  const EmailConfirmationSchema = z.object({
    email: z
      .string({ required_error: t('Invalid Email') })
      .email(t('Invalid Email'))
  });

  try {
    EmailConfirmationSchema.parse({ email });

    if (enrollInMailingList) {
      const organizer = await findOrganizer(event.createdById);
      const isEmailInUse = !!(await findMailingListEnrolledEmail(
        email,
        organizer?.id as string
      ));

      if (isEmailInUse) {
        return badRequest({
          errors: { submit: t('Email in use') }
        });
      }

      if (organizer) {
        await addEmailToMailingList(email, organizer.id);
      }
    }

    await sendBookingConfirmationEmail({
      emailAddress: email,
      event,
      booking,
      domainUrl,
      cart,
      userName: authenticatedClient !== null ? authenticatedClient.name : null
    });

    return json({
      errors: {},
      fields: { email },
      successMessage: t('Booking Confirmation Email Sent')
    });
  } catch (e) {
    if (!(e instanceof ZodError)) {
      const tc = await i18n.getFixedT(request, 'common');

      return badRequest({
        errors: { submit: tc('500 error message') }
      });
    }

    const errors: { [key: string]: string | undefined } = {};

    for (const error of (e as ZodError).errors) {
      errors[error.path[0]] = error.message;
    }

    return badRequest({ errors });
  }
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const bookingId = params.bookingId as string;

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const booking = await findBookingById(bookingId);

  if (!booking || booking.userId !== clientId) {
    return redirect('/');
  }

  const eventId = booking.eventId;
  const raceParticipants = await findUserEventRaceParticipants(
    clientId,
    eventId
  );

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/checkout/cart/${eventId}`);
  }

  if (booking.status !== CheckoutStatus.confirmed) {
    return redirect(
      `/checkout/${
        booking?.status === CheckoutStatus.pending ? 'payment' : 'cart'
      }/${bookingId}`
    );
  }

  const event = await findEvent(eventId);

  if (!event) {
    return redirect('/');
  }

  const cart = await findBookingCart(clientId, eventId);
  const organizer = await findOrganizer(event.createdById);

  return json({
    registration: booking,
    event,
    cart,
    isAuth: !!authenticatedClient,
    bookingId,
    organizerName: organizer?.name as string,
    appliedDiscount: booking.appliedDiscount
  });
};

export default function CheckoutConfirmationRoute() {
  const { registration, event, cart, isAuth, bookingId, organizerName, appliedDiscount } =
    useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>() as ActionData;
  const [checkedAddToMailingList, setCheckedAddToMailingList] =
    useState<boolean>(false);
  const { t } = useTranslation('checkout');
  const fetcher = useFetcher();

  function handleCheckAddToMailingList() {
    setCheckedAddToMailingList(!checkedAddToMailingList);
  }

  let discountValue: string = '0';
  let fixed: string = '';
  let discountCode: string = '';

  if (appliedDiscount) {
    [discountCode, discountValue, fixed] = appliedDiscount.split('|');
  }

  return (
    <Main>
      <div className="flex flex-col justify-start space-y-1 mb-8">
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

      {!isAuth && (
        <div className="flex flex-row items-center justify-end gap-x-2">
          <H6>{t('Already Have An Account ?')}</H6>
          <a href={`/login?a=checkout&b=${bookingId}`} data-cy="authenticate">
            <H6 className="dark:text-blueGray-500 cursor-pointer">
              {t('Login')}
            </H6>
          </a>
        </div>
      )}

      <div className="flex flex-col md:flex-row">
        <div className="flex-col w-full md:w-[calc(100%-(480px))] md:pr-4">
          <H4 data-cy="confirmation-label">{t('Thanks For Buying')}</H4>

          <div className="text-center">
            <div className="mt-8">
              <H4>{t('Confirmation ID')}</H4>
              <H6 className="dark:text-blueGray-500">{registration.id}</H6>
            </div>

            <div className="mt-8">
              <H4>{t('PIN')}</H4>
              <H6 className="dark:text-blueGray-500">{registration.pin}</H6>
            </div>
          </div>

          {!isAuth && (
            <Form method="post" className="flex flex-col items-start mt-16">
              <FormField
                label={t('Mail Confirmation Details')}
                error={actionData?.errors?.email}
              >
                <TextField
                  name="email"
                  className="w-1/2 p-8 mb-2"
                  placeholder={t('Email Address')}
                />
                <div className="flex items-center">
                  <input
                    name="add-to-mail-list"
                    type="checkbox"
                    checked={checkedAddToMailingList}
                    onClick={handleCheckAddToMailingList}
                    className="w-4 h-4 text-indigo-500 bg-gray-100 rounded border-gray-300 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                    data-cy="mail-list"
                  />
                  <label
                    className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                    htmlFor="add-to-mail-list"
                  >
                    {t('Add to X Mailing List', { organizer: organizerName })}
                  </label>
                </div>
              </FormField>
              <Button name="send-confirmation" type="submit" className="mt-4">
                {t('Send')}
              </Button>
              {actionData?.errors?.submit && (
                <InputError className="mt-4" id="error-message">
                  {actionData.errors.submit}
                </InputError>
              )}
              {actionData?.successMessage && (
                <p
                  id="success-message"
                  className="dark:text-blueGray-500 text-gray-500 text-lg mt-2"
                >
                  <span role="img" aria-label="sparkles">
                    ✨
                  </span>{' '}
                  {actionData.successMessage}
                </p>
              )}
            </Form>
          )}
        </div>
        <div className="w-full md:w-[480px] mt-4 md:mt-0">
          <DisplayCart
            cart={cart}
            event={event}
            fetcher={fetcher}
            discountValue={parseInt(discountValue)}
            fixedDiscount={JSON.parse(fixed)}
          />
        </div>
      </div>
    </Main>
  );
}
