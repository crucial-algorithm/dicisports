import type { Event } from '@prisma/client';
import { CheckoutStatus } from '@prisma/client';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { useEffect, useState } from 'react';
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
import { findBooking, findBookingCart } from '~/server/db/booking.server';
import { findEvent } from '~/server/db/events.server';
import { findUserEventRaceParticipants } from '~/server/db/participant.server';
import type { Booking, KCDHandle, UICartRow } from '~/types';
import { badRequest, getDomainUrl, maintainBookingLocalStorageMetaData } from '~/utils/misc';
import { sendBookingConfirmationEmail } from '~/server/email.server';
import i18n from '~/server/i18n.server';
import InputError from '~/components/shared/form/InputError';
import FormField from '~/components/shared/form/FormField';
import { findOrganizer } from '~/server/db/organizer.server';
import {
  addEmailToMailingList,
  findMailingListEnrolledEmail
} from '~/server/db/mailingList.server';
import LoginOrCreateAccountCTA from '~/components/DisplayLoginOrCreateAccountCTA';

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

  const booking = await findBooking(bookingId);

  if (!booking) {
    return badRequest({
      error: t('No Booking')
    });
  }

  if (booking.userId !== clientId) {
    return redirect('/');
  }

  const eventId = booking.eventId;
  const event = await findEvent(eventId);

  if (!event) {
    return redirect('/');
  }

  const domainUrl = getDomainUrl(request);
  const cart = await findBookingCart(bookingId);
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

      if (!isEmailInUse && organizer) {
        try {
          await addEmailToMailingList(email, organizer.id);
        } catch (e) {
          console.log(`failed to add ${email} to mailing list of ${organizer.name}`, e);
        }
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
  const lng = await i18n.getLocale(request);

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const booking = await findBooking(bookingId);

  if (!booking || booking.userId !== clientId) {
    return redirect('/');
  }

  if (booking.status !== CheckoutStatus.confirmed) {
    return redirect(
        `/checkout/${
            booking?.status === CheckoutStatus.pending ? 'payment' : 'cart'
        }/${bookingId}`
    );
  }

  const eventId = booking.eventId;

  const event = await findEvent(eventId);

  if (!event) {
    return redirect('/');
  }

  const raceParticipants = await findUserEventRaceParticipants(bookingId);

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/${lng}/event/${event.slug}`);
  }

  const cart = await findBookingCart(bookingId);
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
  const [
    isSendConfirmationEmailDisabled,
    setIsSendConfirmationEmailDisabled
  ] = useState(true);
  const [
    hideConfirmationEmailForm,
    setHideConfirmationEmailForm
  ] = useState(true);

  function handleCheckAddToMailingList() {
    setCheckedAddToMailingList(!checkedAddToMailingList);
  }

  useEffect(() => {
    const { read, write } =
      maintainBookingLocalStorageMetaData(bookingId);

    // When we re-load the page, after having already sent an e-mail, don't even show the form:
    // check that local storage has already been set to true, but we haven't submitted the form in this page load
    setHideConfirmationEmailForm(
      read().confirmationEmailSent && !actionData?.successMessage
    );

    // Disable form inputs - this will only take effect if the form is visible, which means that it's after form
    // submission and before the user reloads the page
    setIsSendConfirmationEmailDisabled(
      read().confirmationEmailSent || Boolean(actionData?.successMessage)
    );

    if (actionData?.successMessage) {
      write('confirmationEmailSent', true);
    }


  }, [actionData, bookingId, setIsSendConfirmationEmailDisabled]);

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
            <>
              <LoginOrCreateAccountCTA
                t={t}
                bookingId={bookingId}
                cta={t('Dont want to fill information?')}
                className="mt-16"
                subHeaderText={t(
                  'Login Or Create Account Subheader - confirmation'
                )}
              />
              {!hideConfirmationEmailForm && (
                <Form method="post" className="flex flex-col items-start mt-12">
                  <FormField
                    label={t('Mail Confirmation Details')}
                    error={actionData?.errors?.email}
                  >
                    <TextField
                      name="email"
                      className="w-1/2 p-8 mb-2"
                      placeholder={t('Email Address')}
                      disabled={isSendConfirmationEmailDisabled}
                      defaultValue={actionData?.fields?.email || ''}
                    />
                    <div className="flex items-center">
                      <input
                        name="add-to-mail-list"
                        type="checkbox"
                        defaultChecked={checkedAddToMailingList}
                        onClick={handleCheckAddToMailingList}
                        className="w-4 h-4 text-indigo-500 bg-gray-100 rounded border-gray-300 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                        data-cy="mail-list"
                        disabled={isSendConfirmationEmailDisabled}
                      />
                      <label
                        className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                        htmlFor="add-to-mail-list"
                      >
                        {t('Add to X Mailing List', { organizer: organizerName })}
                      </label>
                    </div>
                  </FormField>
                  <Button name="send-confirmation" type="submit" disabled={isSendConfirmationEmailDisabled}>
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
            </>
          )}
        </div>
        <div className="w-full md:w-[480px] mt-4 md:mt-0">
          <DisplayCart
            cart={cart}
            event={event}
            appliedDiscount={appliedDiscount}
          />
        </div>
      </div>
    </Main>
  );
}
