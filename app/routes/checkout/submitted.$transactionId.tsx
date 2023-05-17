import type { LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';

import { findBookingById } from '~/server/db/booking.server';
import { findPayment, updatePaymentStatus } from '~/server/db/payments.server';


export const loader: LoaderFunction = async ({ request, params }) => {

  const paymentId = params.transactionId as string;
  const payment = await findPayment(paymentId);

  if (!payment) {
    // TODO: we need to log this somehow
    return redirect('/');
  }

  const booking = await findBookingById(payment.bookingId);

  if (!booking) {
    // TODO: we need to log this somehow
    return redirect('/');
  }

  await updatePaymentStatus(paymentId, 'submitted');

  return redirect(`/checkout/payment/${payment.bookingId}`);

};
