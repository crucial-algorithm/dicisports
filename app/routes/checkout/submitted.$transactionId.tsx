import { CheckoutStatus, PaymentStatus } from '@prisma/client';
import type { LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';

import { findBooking, updateBookingStatus } from '~/server/db/booking.server';
import { addPaymentMethodDetails, findPayment, updatePaymentStatus } from '~/server/db/payments.server';
import { getPaymentStatus } from '~/server/utils/payments';


export const loader: LoaderFunction = async ({ request, params }) => {
  const paymentId = params.transactionId as string;
  const payment = await findPayment(paymentId);

  console.log('----> SIBS redirected the submitted payment:', paymentId);

  if (!payment) {
    // TODO: we need to log this somehow
    return redirect('/');
  }

  const booking = await findBooking(payment.bookingId);

  if (!booking || booking.status === CheckoutStatus.deleted) {
    // TODO: we need to log this somehow
    return redirect('/');
  }

  if (booking.status === CheckoutStatus.confirmed) {
    console.log('... looks like this booking is already paid... don\'t request status again');
    return redirect(`/checkout/payment/${payment.bookingId}`);
  }

  await updatePaymentStatus(paymentId, PaymentStatus.submitted, PaymentStatus.pending);
  await updateBookingStatus(payment.bookingId, CheckoutStatus.AwaitingPayment);

  try {
    const status = await getPaymentStatus(payment);

    if (status) {
      await addPaymentMethodDetails(
        paymentId,
        status.paymentMethod,
        status.paymentReference?.entity,
        status.paymentReference?.reference,
        status.paymentReference?.expireDate
      );
    } else {
      // we should add log to this... the reason for the failed attempt may be important for debug
      console.error('Status was impossible to retrieve so payment details will be missing... may as well just fail attempt');
      await updatePaymentStatus(paymentId, PaymentStatus.fetchStatusFailed);
      await updateBookingStatus(payment.bookingId, CheckoutStatus.pending);
    }
  } catch (e) {
    console.log(e);
    //TODO: what is the status if getPaymentStatus fails?!?!
  }

  return redirect(`/checkout/payment/${payment.bookingId}`);
};
