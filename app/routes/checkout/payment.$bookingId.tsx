import { CheckoutStatus } from '@prisma/client';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import {
  Form,
  Link,
  useActionData,
  useFetcher,
  useLoaderData
} from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { z, ZodError } from 'zod';

import Button from '~/components/shared/Button';
import DisplayCart from '~/components/shared/DisplayCart';
import DisplayDate from '~/components/shared/DIsplayDate';

import Main from '~/components/shared/Main';
import { H2, H6 } from '~/components/shared/typography';
import { getClientSession } from '~/server/auth/client.server';
import { getUser } from '~/server/auth/session.server';
import {
  findBookingById,
  findBookingCart,
  updateBookingStatus
} from '~/server/db/booking.server';
import { findEvent } from '~/server/db/events.server';
import { findUserEventRaceParticipants } from '~/server/db/participant.server';
import type { Event, UICartRow } from '~/types';
import { sendBookingConfirmationEmail } from '~/server/email.server';
import { badRequest, getDomainUrl } from '~/utils/misc';
import i18n from '~/server/i18n.server';
import InputError from '~/components/shared/form/InputError';
import { findRegulation } from '~/server/documents.server';

type LoaderData = {
  event: Event;
  cart: UICartRow[];
  regulation: Document;
};

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, ['checkout']);

  const form = await request.formData();
  const anonymousClient = await getClientSession(request);
  const authenticatedClient = await getUser(request);
  const bookingId = params.bookingId as string;
  const booking = await findBookingById(bookingId);

  if (!booking) {
    return badRequest({
      error: t('No Booking')
    });
  }

  const eventId = booking.eventId;

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  const actionId = form.get('actionId');

  if (actionId === 'update-info') {
    await updateBookingStatus(CheckoutStatus.checkout, clientId, eventId);

    return redirect(`/checkout/info/${bookingId}`);
  }

  const regulation: boolean = (form.get('regulation') as string) === 'on';
  const terms: boolean = (form.get('terms') as string) === 'on';

  const PaymentSchema = z.object({
    terms: z
      .boolean({ required_error: t('Accept All Terms') })
      .refine((v) => v, { message: t('Accept All Terms') }),
    regulation: z
      .boolean({ required_error: t('Accept All Terms') })
      .refine((v) => v, { message: t('Accept All Terms') })
  });

  try {
    PaymentSchema.parse({ regulation, terms });

    await updateBookingStatus(CheckoutStatus.confirmed, clientId, eventId);

  if (authenticatedClient !== null) {
    const event = await findEvent(eventId);
    const domainUrl = getDomainUrl(request);
    const cart = await findBookingCart(clientId, eventId);

    await sendBookingConfirmationEmail({
      emailAddress: authenticatedClient.email,
      event,
      booking,
      domainUrl,
      cart,
      userName: authenticatedClient.name
    });
  }

  return redirect(`/checkout/confirmation/${bookingId}`);
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

  const booking = await findBookingById(bookingId);

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  if (!booking || booking.userId !== clientId) {
    return redirect('/');
  }

  const eventId = booking.eventId;

  const event = await findEvent(eventId);
  const cart = await findBookingCart(clientId, eventId);
  const raceParticipants = await findUserEventRaceParticipants(
    clientId,
    eventId
  );

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/checkout/cart/${eventId}`);
  }

  if (booking?.status !== CheckoutStatus.pending) {
    return redirect(
      `/checkout/${
        booking?.status === CheckoutStatus.checkout ? 'info' : 'confirmation'
      }/${bookingId}`
    );
  }

  return json({
    event,
    cart,
    regulation: await findRegulation(eventId)
  });
};

type ActionData = {
  errors?: {
    terms?: string;
    regulation?: string;
  };
};

export default function CheckoutPaymentRoute() {
  const actionData = useActionData<ActionData>();
  const { event, cart, regulation } = useLoaderData<LoaderData>();
  const { t } = useTranslation('checkout');
  const fetcher = useFetcher();

  const isInlineRegulation = regulation && regulation.content !== null;

  return (
    <Main>
      <div className="flex flex-col justify-start space-y-1">
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
      <div className="flex flex-col md:flex-row mt-8">
        {/*Payment Form*/}
        <div className="flex-col w-full md:w-[calc(100%-(480px))] md:pr-4">
          <Form method="post">
            <div className="flex items-center mb-2">
              <input
                name="regulation"
                type="checkbox"
                className="w-4 h-4 text-indigo-500 bg-gray-100 rounded border-gray-300 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
              />
              <label
                className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300"
                htmlFor="regulation"
              >
                {t('Read and Accepted')}
                <Link
                  target="_blank"
                  to={
                    isInlineRegulation
                      ? `/${event.slug}/regulation`
                      : `/${event.id}/doc/${regulation.id}/view`
                  }
                  data-cy="regulation-link"
                >
                  {t('Event Regulation')}
                </Link>
              </label>
            </div>

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
                <Link target="_blank" to="/terms" data-cy="terms-link">
                  {t('Terms and Conditions')}
                </Link>
              </label>
            </div>

            <InputError id="terms-error" className="mb-2">
              {actionData?.errors?.terms || actionData?.errors?.regulation}
            </InputError>

            <Button type="submit" name="pay">
              {t('Pay')}
            </Button>
          </Form>
        </div>
        <div className="w-full md:w-[480px]">
          <DisplayCart cart={cart} event={event} fetcher={fetcher}>
            <div>
              <Button
                name="actionId"
                className="mt-4 w-full"
                type="submit"
                value="update-info"
              >
                {t('Edit info')}
              </Button>
            </div>
          </DisplayCart>
        </div>
      </div>
    </Main>
  );
}
