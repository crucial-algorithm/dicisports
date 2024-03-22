import type { Booking, Event, Payment } from '@prisma/client';
import {
  CheckoutStatus,
  DiscountCodeStatus,
  PaymentMethod,
  PaymentStatus
} from '@prisma/client';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, useFetcher, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ZodError } from 'zod';
import type { TFunction } from 'i18next';

import Button from '~/components/shared/Button';
import DisplayCart from '~/components/shared/DisplayCart';
import DisplayDate from '~/components/shared/DIsplayDate';
import Multibanco from '~/components/shared/icons/Multibanco';
import MultibancoContrast from '~/components/shared/icons/MultibancoContrast';

import Main from '~/components/shared/Main';
import { H2, H5, H6, Paragraph } from '~/components/shared/typography';
import { getClientSession } from '~/server/auth/client.server';
import { getUser } from '~/server/auth/session.server';
import Config from '~/server/config.server';
import {
  applyDiscountCode,
  checkIfBookingEditionIsLocked,
  findBooking,
  findBookingCart,
  removeBookingDiscount,
  updateBookingStatus
} from '~/server/db/booking.server';
import { findEvent } from '~/server/db/events.server';
import type {
  RaceParticipantWithRaceParticipantAndTeam
} from '~/server/db/participant.server';
import {
  assignParticipantsBibNumber,
  findUserBookingParticipants
} from '~/server/db/participant.server';
import {
  findSubmittedPayments,
  findUnsuccessfulPayments,
  isBookingPaid,
  resetPaymentStatus
} from '~/server/db/payments.server';
import type { KCDHandle, UICartRow } from '~/types';
import { sendBookingConfirmationEmail } from '~/server/email.server';
import { badRequest, bookingAmount, getDomainUrl } from '~/utils/misc';
import i18n from '~/server/i18n.server';
import { createPaymentTransaction } from '~/server/utils/payments';
import { useTheme } from '~/utils/theme-provider';
import { findDiscountCode } from '~/server/db/discounts.server';
import { findOrganizer } from '~/server/db/organizer.server';
import ButtonGroup from '~/components/shared/ButtonGroup';

type LoaderData =
  | {
      state: 'PaymentsPending';
      event: Event;
      cart: UICartRow[];
      isBookingReadOnly: true;
      submittedPayments: Payment[];
      domainUrl: string;
      discountCode: string;
      discountValue: number;
      discountFixed: boolean;
      displayTransactionError: false;
    }
  | {
      state: 'RequestingPayment';
      event: Event;
      cart: UICartRow[];
      isBookingReadOnly: false;
      unsuccessfulPayments: Payment[]; 
      formContext: string;
      gatewayTransactionId: string;
      ourTransactionId: string;
      CHECKOUT_FORM_SCRIPT: string;
      domainUrl: string;
      discountCode: string;
      discountValue: number;
      discountFixed: boolean;
      displayTransactionError: false;
    }
  | {
      state: 'Error';
      event: Event;
      cart: UICartRow[];
      submittedPayments: Payment[];
      displayTransactionError: true;
    };

export const loader: LoaderFunction = async ({ request, params }) => {
  console.log('in loader of payment screen');
  const anonymousClient = await getClientSession(request);
  const authedUser = await getUser(request);
  const bookingId = params.bookingId as string;
  const booking = await findBooking(bookingId);
  const lng = await i18n.getLocale(request);

  if (!booking || booking.status === CheckoutStatus.deleted) {
    console.log('no booking or deleted booking', bookingId);
    return redirect('/');
  }

  const userId =
    authedUser !== null
      ? authedUser.id
      : anonymousClient.getClientId();

  if (booking.userId !== userId) {
    console.log(`User not authorized to access booking with owner = ${booking.userId}; Attempt by ${userId}`);
    return redirect('/');
  }

  const eventId = booking.eventId;
  const event = (await findEvent(eventId)) as Event;

  if (!event) {
    console.log('no event', eventId);
    return redirect('/');
  }

  const cart = await findBookingCart(bookingId);
  const raceParticipants = await findUserBookingParticipants(bookingId);

  if (!raceParticipants || raceParticipants?.length === 0) {
    return redirect(`/${lng}/event/${event.slug}`);
  }

  if (booking.status == CheckoutStatus.checkout) {
    return redirect(`/checkout/info/${bookingId}`);
  }

  if (booking.status == CheckoutStatus.AwaitingPayment) {
    return json({
      state: 'PaymentsPending',
      event,
      cart,
      isBookingReadOnly: checkIfBookingEditionIsLocked(booking),
      submittedPayments: await findSubmittedPayments(bookingId),
      domainUrl: getDomainUrl(request),
      discountCode: booking.discountCode,
      discountValue: booking.discountValue,
      discountFixed: booking.discountFixed,
      displayTransactionError: false
    } as LoaderData);
  }


  // function will assign a bib number if booking is fully discounted 
  const isThereNoPaymentLeft = await handleFullDiscountBookings(
    booking,
    cart,
    raceParticipants,
    eventId
  );

  if (isThereNoPaymentLeft) {
    // check if for some reason the booking status is inconsistent
    if (booking.status !== CheckoutStatus.confirmed) {
      await updateBookingStatus(bookingId, CheckoutStatus.confirmed);
    }

    if (authedUser !== null) {
      const event = await findEvent(eventId);
      const cart = await findBookingCart(bookingId);

      await sendBookingConfirmationEmail({
        emailAddress: authedUser.email,
        event,
        booking,
        cart,
        userName: authedUser.name
      });
    }

    return redirect(`/checkout/confirmation/${bookingId}`);
  }

  const submittedPayments = await findSubmittedPayments(bookingId);

  if (submittedPayments.length > 0) {
    return json({
      state: 'PaymentsPending',
      event,
      cart,
      isBookingReadOnly: checkIfBookingEditionIsLocked(booking),
      submittedPayments,
      domainUrl: getDomainUrl(request),
      discountCode: booking.discountCode,
      discountValue: booking.discountValue,
      discountFixed: booking.discountFixed,
      displayTransactionError: false
    } as LoaderData);
  }

  const unsuccessfulPayments = await findUnsuccessfulPayments(bookingId);

  try {
    const { gatewayResponse, ourTransactionId } =
      await createPaymentTransaction(booking, event, cart);

    return json({
      state: 'RequestingPayment',
      event,
      cart,
      isBookingReadOnly: checkIfBookingEditionIsLocked(booking),
      unsuccessfulPayments,
      formContext: gatewayResponse.formContext,
      gatewayTransactionId: gatewayResponse.transactionID,
      ourTransactionId,
      CHECKOUT_FORM_SCRIPT: Config().SIBS_CHECKOUT_FORM_SCRIPT,
      domainUrl: getDomainUrl(request),
      discountCode: booking.discountCode,
      discountValue: booking.discountValue,
      discountFixed: booking.discountFixed,
      displayTransactionError: false
    } as LoaderData);
  } catch (e) {
    console.log(e);

    return json({
      state: 'Error',
      event,
      cart,
      submittedPayments,
      displayTransactionError: true
    } as LoaderData);
  }
};

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, ['checkout']);

  const form = await request.formData();
  const anonymousClient = await getClientSession(request);
  const authedUser = await getUser(request);
  const bookingId = params.bookingId as string;
  const booking = await findBooking(bookingId);

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

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authedUser !== null
      ? authedUser.id
      : anonymousClient.getClientId();

  if (booking && booking.status === CheckoutStatus.confirmed) {
    if (booking.userId === clientId) {
      return redirect(`/checkout/confirmation/${booking.id}`);
    }

    return redirect('/');
  }

  const submittedPayments = await findSubmittedPayments(bookingId);

  // This prevents malicious users from attempting to add more than those they are trying to pay for
  if (submittedPayments && submittedPayments.length > 0) {
    return badRequest({ error: t('Ongoing payment') });
  }

  const actionId = form.get('actionId');

  if (actionId === 'update-info') {
    await updateBookingStatus(bookingId, CheckoutStatus.checkout);

    return redirect(`/checkout/info/${bookingId}`);
  }

  if (actionId === 'new-payment') {
    const paymentId = form.get('paymentId') as string;

    await resetPaymentStatus(paymentId);

    return redirect(`/checkout/payment/${bookingId}`);
  }

  try {
    if (actionId === 'apply-discount') {
      const discountCode = form.get('discount-code') as string;
      const organizer = await findOrganizer(event.createdById);
      const dbDiscountCode = await findDiscountCode(
        discountCode,
        organizer?.id as string
      );

      if (
        !dbDiscountCode ||
        dbDiscountCode.status !== DiscountCodeStatus.active
      ) {
        return badRequest({ errors: { discountError: t('No Discount Code') } });
      }
      const cart = await findBookingCart(bookingId);

      await applyDiscountCode(
        booking.id,
        dbDiscountCode.code,
        dbDiscountCode.value,
        dbDiscountCode.fixed,
        cart
      );

      return json({ ok: true });
    }

    if (actionId === 'remove-discount') {
      await removeBookingDiscount(booking.id);

      return json({ ok: true });
    }

    return json({ ok: true });
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

async function handleFullDiscountBookings(
  booking: Booking,
  cart: UICartRow[],
  raceParticipants: RaceParticipantWithRaceParticipantAndTeam[],
  eventId: string
) {
  let fullyDiscounted = false;

  if (booking.discountCode) {
    const amount = bookingAmount(
      cart,
      booking.discountValue,
      booking.discountFixed
    );

    if (amount === 0) {
      await assignParticipantsBibNumber(raceParticipants, eventId);
      fullyDiscounted = true;
    }
  }

  const hasASuccessfulPayment = await isBookingPaid(booking.id);

  return hasASuccessfulPayment || fullyDiscounted;
}

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

export default function CheckoutPaymentRoute() {
  const data = useLoaderData() as unknown as LoaderData;
  const { t } = useTranslation('checkout');
  const displayCartFetcher = useFetcher();
  const [errors, setErrors] = useState<FormErrors>({});
  const { state, event, cart } = data;

const sibsPaymentGatewayError =
  state === 'RequestingPayment' &&
  data.unsuccessfulPayments &&
  data.unsuccessfulPayments.filter(
    (p) => p.status === PaymentStatus.fetchStatusFailed
  );


  useEffect(() => {
    if (
      displayCartFetcher.type === 'actionReload' &&
      displayCartFetcher.data?.errors
    ) {
      return setErrors(displayCartFetcher.data.errors as FormErrors);
    }

    if (
      displayCartFetcher.type === 'actionReload' &&
      displayCartFetcher.data?.ok
    ) {
      return setErrors({});
    }
  }, [displayCartFetcher]);

  if (data.displayTransactionError) {
    return <DisplayTransactionError event={event} t={t} />;
  }

  if (sibsPaymentGatewayError && sibsPaymentGatewayError.length > 0) {
    return (
      <DisplayGetPaymentStatusErrorOptions
        paymentId={sibsPaymentGatewayError[0].id}
        t={t}
      />
    );
  }

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

        <div className="flex-col w-full md:w-[calc(100%-(480px))] md:pr-4 sibs">
          
          {state === 'PaymentsPending' && (
            <DisplayPendingPaymentsInterval payments={data.submittedPayments} />
          )}

          {state === 'RequestingPayment' && (
            <>
              {data.unsuccessfulPayments.length > 0 && (
                <H6 className="mb-8">{t('We Give Up On Past Payments')}</H6>
              )}
              <PaymentForm
                script={data.CHECKOUT_FORM_SCRIPT}
                gatewayTransactionId={data.gatewayTransactionId}
                cart={cart}
                discountValue={data.discountValue}
                discountFixed={data.discountFixed}
                formContext={data.formContext}
                redirectUrl={`${data.domainUrl}/checkout/submitted/${data.ourTransactionId}`}
              />
            </>
          )}

        </div>

        <div className="w-full mt-4 md:mt-0 md:w-[480px]">
          <displayCartFetcher.Form method="post">
            <DisplayCart
              cart={cart}
              event={event}
              discountCode={data.discountCode}
              discountValue={data.discountValue}
              discountFixed={data.discountFixed}
              discountCodeError={errors.discountError}
              showDiscountCodeInput={!data.isBookingReadOnly}
            >
              {!data.isBookingReadOnly && (
                <Button
                  id="update-info"
                  name="actionId"
                  className="mt-4 w-full"
                  type="submit"
                  value="update-info"
                >
                  {t('Edit info')}
                </Button>
              )}
            </DisplayCart>
          </displayCartFetcher.Form>
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
  discountValue?: number;
  discountFixed?: boolean;
};

function PaymentForm({
  script,
  gatewayTransactionId,
  cart,
  formContext,
  redirectUrl,
  discountValue,
  discountFixed = false
}: PaymentFormProps) {
  const [theme] = useTheme();
  const style = JSON.stringify(
    theme === 'dark' ? sibsDarkTheme : sibsLightTheme
  );
  const formScriptSrc = `${script}?id=${gatewayTransactionId}`;

  function handleAmount(): number {
    return bookingAmount(cart, discountValue, discountFixed);
  }

  const formConfig = JSON.stringify({
    paymentMethodList: [],
    amount: { value: handleAmount() / 1000, currency: 'EUR' },
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

function DisplayPendingPaymentsInterval({
  payments
}: DisplayPendingPaymentProps) {
  const checkPaymentstatus = useFetcher();
  const payment = payments.sort(
    ({ createdAt: a }, { createdAt: b }) =>
      new Date(a).getTime() - new Date(b).getTime()
  )[0];
  const url = `/payment-status/${payment.id}`;

  useEffect(() => {
    const interval = setInterval(() => {
      // we should add a "give up" strategy here
      if (
        checkPaymentstatus.state === 'idle' &&
        (checkPaymentstatus.data == null ||
          checkPaymentstatus.data.payment?.status === PaymentStatus.submitted ||
          checkPaymentstatus.data.success === false)
      ) {
        checkPaymentstatus.load(url);
      }
    }, 5 * 1000);

    return () => clearInterval(interval);
  }, [checkPaymentstatus, url]);

  if (!checkPaymentstatus?.data) {
    return <DisplayPendingPayments payment={payment} />;
  }

  const upToDatePaymentData = checkPaymentstatus.data.payment as Payment;

  if (!upToDatePaymentData) {
    // we got a response from server, but likely the request to payment gateway failed
    return <WaitingPaymentPending />;
  }

  if (
    upToDatePaymentData.status === PaymentStatus.paid ||
    upToDatePaymentData.status === PaymentStatus.failed
  ) {
    window.location.reload();
  }

  return <DisplayPendingPayments payment={upToDatePaymentData} />;
}

function DisplayPendingPayments({ payment }: { payment: Payment }) {
  const { t } = useTranslation('checkout');

  if (payment.method === PaymentMethod.REFERENCE && payment.mbReference) {
    return (
      <DisplayMultibancoInfo
        entity={String(payment.mbEntity)}
        reference={payment.mbReference}
        amount={payment.amount}
      />
    );
  }

  if (
    payment.method === PaymentMethod.MBWAY ||
    payment.method === PaymentMethod.CARD
  ) {
    const message = t(
      payment.method === PaymentMethod.MBWAY
        ? 'MBWay Instructions'
        : 'Credit Card Instructions'
    );

    return (
      <div className="flex items-center w-fit">
        <Paragraph className="mr-4">{message}</Paragraph>
        <div
          className="text-secondary ml-auto inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
          role="status"
        />
      </div>
    );
  }

  return <WaitingPaymentPending />;
}

function WaitingPaymentPending(props: {}) {
  const { t } = useTranslation('checkout');

  return (
    <div
      data-cy="waiting-payment-confirmation"
      className="text-lg dark:text-white"
    >
      {t('Waitting for payment gateway')}
    </div>
  );
}

type MultibancoProps = {
  entity: string;
  reference: string;
  amount: number;
};

function DisplayMultibancoInfo({ entity, reference, amount }: MultibancoProps) {
  const { t } = useTranslation('checkout');

  // leaving for debug
  console.log(entity, reference, amount);

  return (
    <>
      <H5 className="mb-6">{t('Multibanco Instructions')}</H5>
      <table border={1} className="w-96 text-right text-lg dark:text-white">
        <tbody>
          <tr>
            <td rowSpan={3}>
              <Multibanco className="w-28 dark:hidden" />
              <MultibancoContrast className="w-28 hidden dark:block" />
            </td>
            <td className="font-bold">{t('Multibanco Entity')}:</td>
            <td>{entity}</td>
          </tr>
          <tr>
            <td className="font-bold">{t('Multibanco Reference')}:</td>
            <td>{formatMbReference(String(reference))}</td>
          </tr>
          <tr>
            <td className="font-bold">{t('Multibanco Amount')}:</td>
            <td>{(amount / 1000).toFixed(2)}€</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function formatMbReference(reference: string) {
  return (reference.match(/.{1,3}/g) || []).join(' ');
}

type FormErrors = {
  discountError?: string;
};

function DisplayTransactionError({ event, t }: { event: Event; t: TFunction }) {
  function onClick() {
    window.location.reload();
  }

  return (
    <Main>
      <div className="flex flex-col justify-start space-y-1 mb-4">
        <H2>
          <b data-cy="name" className="break-words w-full">
            {event.name}
          </b>
        </H2>
        <H6>
          <DisplayDate date={new Date(event.startAt as unknown as string)} />
        </H6>
      </div>
      <H5 className="mb-2">{t('Transaction Error')}</H5>
      <Button type="button" onClick={onClick}>
        {t('Try Again')}
      </Button>
</Main>
  );
}

function DisplayGetPaymentStatusErrorOptions({
  paymentId,
  t
}: {
  paymentId: string;
  t: TFunction;
}) {
  function handleCheckPaymentStatus() {
    window.location.reload();
  }

  return (
    <Main>
      <H5 data-cy="gateway-error" className="mb-4">
        {t('Sibs Gateway Error')}
      </H5>
      <Form method="post">
        <input type="hidden" name="paymentId" value={paymentId} />
        <ButtonGroup>
          <Button
            type="submit"
            variant="danger"
            name="actionId"
            value="new-payment"
          >
            {t('New Payment')}
          </Button>
          <Button
            name="get-payment-status"
            type="button"
            variant="primary"
            onClick={handleCheckPaymentStatus}
          >
            {t('Check Payment Status')}
          </Button>
        </ButtonGroup>
      </Form>
    </Main>
  );
}
