import { PaymentStatus } from '@prisma/client';
import type { LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';

import { findBookingById } from '~/server/db/booking.server';
import { addPaymentMethodDetails, findPayment, updatePaymentStatus } from '~/server/db/payments.server';
import { getPaymentStatus } from '~/server/utils/payments';


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

  await updatePaymentStatus(paymentId, PaymentStatus.submitted, PaymentStatus.pending);

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
    }
  } catch (e) {
    console.log(e);
  }

  return redirect(`/checkout/payment/${payment.bookingId}`);
};
