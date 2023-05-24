import type { Payment } from '@prisma/client';
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
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { z, ZodError } from 'zod';

import Button from '~/components/shared/Button';
import DisplayCart from '~/components/shared/DisplayCart';
import DisplayDate from '~/components/shared/DIsplayDate';

import Main from '~/components/shared/Main';
import { H2, H6 } from '~/components/shared/typography';
import { getClientSession } from '~/server/auth/client.server';
import { getUser } from '~/server/auth/session.server';
import Config from '~/server/config.server';
import {
  findBookingById,
  findBookingCart,
  updateBookingStatus
} from '~/server/db/booking.server';
import { findEvent } from '~/server/db/events.server';
import { findUserEventRaceParticipants } from '~/server/db/participant.server';
import {
  findExpiredPayments,
  findSubmittedPayments,
  isBookingPaid
} from '~/server/db/payments.server';
import type { Event, KCDHandle, UICartRow } from '~/types';
import { sendBookingConfirmationEmail } from '~/server/email.server';
import { badRequest, bookingAmount, getDomainUrl } from '~/utils/misc';
import i18n from '~/server/i18n.server';
import { createPayamentTransaction } from '~/server/utils/payments';
import { useTheme } from '~/utils/theme-provider';
import InputError from '~/components/shared/form/InputError';

type LoaderData = {
  event: Event;
  cart: UICartRow[];
  regulation: Document;
  submittedPayments: Payment[];
  expiredPayments: Payment[];
  formContext: string;
  gatewayTransactionId: string;
  ourTransactionId: string;
  CHECKOUT_FORM_SCRIPT: string;
  domainUrl: string;
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
    await updateBookingStatus(bookingId, CheckoutStatus.checkout);

    return redirect(`/checkout/info/${bookingId}`);
  }

  const regulation: boolean = (form.get('regulation') as string) === 'on';
  const terms: boolean = (form.get('terms') as string) === 'on';

  const TermsAndRegulationSchema = z.object({
    terms: z
      .boolean({ required_error: t('Accept Dici Terms') })
      .refine((v) => v, { message: t('Accept Dici Terms') }),
    regulation: z
      .boolean({ required_error: t('Accept Event Regulation') })
      .refine((v) => v, { message: t('Accept Event Regulation') })
  });

  try {
    TermsAndRegulationSchema.parse({ regulation, terms });

    await updateBookingStatus(bookingId, CheckoutStatus.confirmed);

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

  if (!booking) {
    return redirect('/');
  }

  if (booking.userId !== clientId) {
    return redirect('/');
  }

  const eventId = booking.eventId;

  const event = (await findEvent(eventId)) as Event;
  const cart = await findBookingCart(clientId, eventId);
  const raceParticipants = await findUserEventRaceParticipants(
    clientId,
    eventId
  );

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/checkout/cart/${eventId}`);
  }

  const hasASuccessfullPayment = await isBookingPaid(bookingId);

  if (hasASuccessfullPayment) {
    // check if for some reason the booking status is inconsistent
    if (booking.status !== CheckoutStatus.confirmed) {
      await updateBookingStatus(bookingId, CheckoutStatus.confirmed);
    }

    return redirect(`/checkout/confirmation/${bookingId}`);
  }

  if (booking.status == CheckoutStatus.checkout) {
    return redirect(`/checkout/info/${bookingId}`);
  }

  const submittedPayments = await findSubmittedPayments(bookingId);

  if (submittedPayments.length > 0) {
    return json({
      event,
      cart,
      submittedPayments,
      domainUrl: getDomainUrl(request)
    });
  }

  const expiredPayments = await findExpiredPayments(bookingId);
  const { gatewayResponse, ourTransactionId } = await createPayamentTransaction(
    booking,
    event,
    cart
  );

  return json({
    event,
    cart,
    formContext: gatewayResponse.formContext,
    gatewayTransactionId: gatewayResponse.transactionID,
    ourTransactionId,
    CHECKOUT_FORM_SCRIPT: Config().SIBS_CHECKOUT_FORM_SCRIPT,
    expiredPayments,
    domainUrl: getDomainUrl(request)
  });
};

export const handle: KCDHandle & { id: string; i18n: string[] } = {
  id: 'payment',
  i18n: ['checkout']
};

const sibsDarkTheme = {
  layout: 'default',
  theme: 'default',
  color: {
    primary: '#ef7f1a',
    secondary: '#ef7f1a',
    border: undefined,
    surface: undefined,
    header: {
      text: '#ffffff',
      background: '#2f3037' // '#1F2028'
    },
    body: {
      text: '#ffffff',
      background: '#2f3037' // '#1F2028'
    }
  }
};

const sibsLightTheme = {
  layout: 'default',
  theme: 'default',
  color: {
    primary: '#ef7f1a',
    secondary: '#ef7f1a',
    border: undefined,
    surface: undefined,
    header: {
      text: undefined,
      background: undefined
    },
    body: {
      text: undefined,
      background: undefined
    }
  }
};

type ActionData = {
  errors?: {
    terms?: string;
    regulation?: string;
  };
};

export default function CheckoutPaymentRoute() {
  const actionData = useActionData<ActionData>();
  const {
    event,
    cart,
    expiredPayments,
    submittedPayments,
    formContext,
    gatewayTransactionId,
    ourTransactionId,
    CHECKOUT_FORM_SCRIPT,
    domainUrl
  } = useLoaderData() as LoaderData;
  const { t } = useTranslation('checkout');
  const fetcher = useFetcher();

  const isInlineRegulation = event.regulationContent && true;

  return (
    <Main>
      <div className="flex flex-col justify-start space-y-1">
        <H2>
          <b data-cy="name" className="break-words w-full">
            {event.name}
          </b>
        </H2>
        <H6>
          <DisplayDate date={new Date(event.startAt as unknown as string)} />
        </H6>
      </div>
      <div className="flex flex-col md:flex-row mt-8">
        {/*Payment Form*/}
        <div className="flex-col w-full md:w-[calc(100%-(480px))] md:pr-4 sibs">
          {submittedPayments && submittedPayments.length > 0 && (
            <DisplayPendingPayments payments={submittedPayments} />
          )}
          {!(submittedPayments && submittedPayments.length > 0) && (
            <>
              {expiredPayments.length > 0 && (
                <H6>Show expired payments info</H6>
              )}
              <PaymentForm
                script={CHECKOUT_FORM_SCRIPT}
                gatewayTransactionId={gatewayTransactionId}
                cart={cart}
                formContext={formContext}
                redirectUrl={`${domainUrl}/checkout/submitted/${ourTransactionId}`}
              />
            </>
          )}
        </div>
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
                      ? `/event/${event.slug}/regulation`
                      : `/event/${event.id}/doc/regulation/view`
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
              {actionData?.errors?.submit ||
                actionData?.errors?.terms ||
                actionData?.errors?.regulation}
            </InputError>
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

type PaymentFormProps = {
  script: string;
  gatewayTransactionId: string;
  cart: UICartRow[];
  formContext: string;
  redirectUrl: string;
};

function PaymentForm({
  script,
  gatewayTransactionId,
  cart,
  formContext,
  redirectUrl
}: PaymentFormProps) {
  const [theme] = useTheme();
  const style = JSON.stringify(
    theme === 'dark' ? sibsDarkTheme : sibsLightTheme
  );
  const formScriptSrc = `${script}?id=${gatewayTransactionId}`;
  const formConfig = JSON.stringify({
    paymentMethodList: [],
    amount: { value: bookingAmount(cart), currency: 'EUR' },
    language: 'pt',
    redirectUrl,
    customerData: null
  });

  useEffect(() => {
    const script = document.createElement('script');

    script.src = formScriptSrc;
    script.async = true;

    document.body.appendChild(script);
  }, [formScriptSrc]);

  return (
    <form
      className="paymentSPG"
      spg-context={formContext}
      spg-config={formConfig}
      spg-style={style}
    />
  );
}

type DisplayPendingPaymentProps = {
  payments: Payment[];
};

function DisplayPendingPayments(props: DisplayPendingPaymentProps) {
  const { t } = useTranslation('checkout');

  return (
    <div data-cy="waiting-payment-confirmation">
      {t('Waitting for payment gateway')}
    </div>
  );
}
