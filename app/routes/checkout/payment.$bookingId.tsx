import type { Payment } from '@prisma/client';
import { CheckoutStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ZodError } from 'zod';

import type { Event } from '@prisma/client';
import { Toast } from 'primereact/toast';

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
  findBookingById,
  findBookingCart,
  removeBookingDiscount,
  updateBookingStatus
} from '~/server/db/booking.server';
import { findEvent } from '~/server/db/events.server';
import { findUserEventRaceParticipants } from '~/server/db/participant.server';
import {
  findSubmittedPayments,
  findUnsuccessfulPayments,
  isBookingPaid
} from '~/server/db/payments.server';
import type { DiscountCode, KCDHandle, UICartRow } from '~/types';
import { sendBookingConfirmationEmail } from '~/server/email.server';
import { badRequest, bookingAmount, getDomainUrl } from '~/utils/misc';
import i18n from '~/server/i18n.server';
import { createPayamentTransaction } from '~/server/utils/payments';
import { useTheme } from '~/utils/theme-provider';
import { findDiscountCode } from '~/server/db/discounts.server';
import { findOrganizer } from '~/server/db/organizer.server';

type LoaderData = {
  event: Event;
  cart: UICartRow[];
  regulation: Document;
  submittedPayments: Payment[];
  unsuccessfulPayments: Payment[];
  formContext: string;
  gatewayTransactionId: string;
  ourTransactionId: string;
  CHECKOUT_FORM_SCRIPT: string;
  domainUrl: string;
  appliedDiscount?: string;
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

  const unsuccessfulPayments = await findUnsuccessfulPayments(bookingId);
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
    unsuccessfulPayments,
    domainUrl: getDomainUrl(request),
    appliedDiscount: booking.appliedDiscount
  });
};

type ResponseFeedback = {
  severity: 'error' | 'success' | 'info' | 'warn';
  message: string;
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
  const event = await findEvent(eventId);

  if (!event) {
    return redirect('/');
  }

  // We check if user is authenticated -> authenticatedClient, if not, we use the client session -> anonymousClient
  const clientId =
    authenticatedClient !== null
      ? authenticatedClient.id
      : anonymousClient.getClientId();

  if (booking && booking.status === CheckoutStatus.confirmed) {
    if (booking.userId === clientId) {
      return redirect(`/checkout/confirmation/${booking.id}`);
    }

    return redirect('/');
  }

  const actionId = form.get('actionId');

  if (actionId === 'update-info') {
    await updateBookingStatus(bookingId, CheckoutStatus.checkout);

    return redirect(`/checkout/info/${bookingId}`);
  }

  async function isDiscountAppliable(discount: DiscountCode): Promise<boolean> {
    const bookingCart = await findBookingCart(clientId, eventId);
    const totalPrice = bookingAmount(bookingCart, discount.value, discount.fixed);

    if (totalPrice < 0) {
      return false;
    }

    return true;
  }

  try {
    let feedback: ResponseFeedback | undefined;

    if (actionId === 'apply-discount') {
      const discountCode = form.get('discount-code') as string;
      const organizer = await findOrganizer(event.createdById);
      const dbDiscountCode = await findDiscountCode(
        discountCode,
        organizer?.id as string
      );

      if (!dbDiscountCode || !dbDiscountCode.active) {
        feedback = { severity: 'error', message: t('No Discount Code') };

        return json({ feedback });
      }


      if (dbDiscountCode.fixed) {
        const bookingCart = await findBookingCart(clientId, eventId);
        const totalPrice = bookingAmount(bookingCart, dbDiscountCode.value, dbDiscountCode.fixed);
    
        if (totalPrice < 0) {
          feedback = {
            severity: 'error',
            message: t('Discount Cannot be applied')
          };

          return json({ feedback });
        }
      }

      await applyDiscountCode(
        booking.id,
        `${dbDiscountCode.code}|${dbDiscountCode.value}|${dbDiscountCode.fixed}`
      );
      feedback = { severity: 'success', message: t('Discount Applied') };

      return json({ feedback });
    }

    if (actionId === 'remove-discount') {
      await removeBookingDiscount(booking.id);
      feedback = { severity: 'success', message: t('Discount Removed') };

      return json({ feedback });
    }

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
  const {
    event,
    cart,
    unsuccessfulPayments,
    submittedPayments,
    formContext,
    gatewayTransactionId,
    ourTransactionId,
    CHECKOUT_FORM_SCRIPT,
    domainUrl,
    appliedDiscount
  } = useLoaderData() as LoaderData;
  const { t } = useTranslation('checkout');
  const displayCartFetcher = useFetcher();
  const isPaid =
    submittedPayments &&
    submittedPayments.filter((p) => (p.status = PaymentStatus.paid)).length ===
      0;

  const toast = useRef<Toast>(null);
  const feedback = displayCartFetcher?.data?.feedback;

  useEffect(() => {
    if (!toast.current || !feedback) {
      return;
    }

    toast.current.show({
      severity: feedback.severity,
      detail: feedback.message,
      life: 3000
    });
  }, [toast, feedback]);

  return (
    <Main>
      <Toast ref={toast} />
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
          {submittedPayments && submittedPayments.length > 0 && (
            <DisplayPendingPaymentsInterval payments={submittedPayments} />
          )}
          {!(submittedPayments && submittedPayments.length > 0) && (
            <>
              {unsuccessfulPayments.length > 0 && (
                <H6 className="mb-8">{t('We Give Up On Past Payments')}</H6>
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
        <div className="w-full md:w-[480px]">
          <DisplayCart
            cart={cart}
            event={event}
            fetcher={displayCartFetcher}
            appliedDiscount={appliedDiscount}
            showDiscountCodeInput={true}
          >
            {!isPaid && !(submittedPayments && submittedPayments.length > 0) && (
              <Button
                name="actionId"
                className="mt-4 w-full"
                type="submit"
                value="update-info"
              >
                {t('Edit info')}
              </Button>
            )}
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
    amount: { value: bookingAmount(cart) / 1000, currency: 'EUR' },
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
  return Number(reference)
    .toLocaleString()
    .replace(/,/g, ' ')
    .replace(/\./g, ' ');
}
