import { CheckoutStatus, PaymentStatus } from '@prisma/client';
import type { LoaderFunction } from '@remix-run/node';

import { redirect } from '@remix-run/node';

import { db } from '~/server/db.server';

import { findBooking } from '~/server/db/booking.server';
import { addPaymentMethodDetails, findPayment } from '~/server/db/payments.server';
import { getPaymentStatus } from '~/server/utils/payments';


export const loader: LoaderFunction = async ({ request, params }) => {
  const paymentId = params.transactionId as string;
  const payment = await findPayment(paymentId);

  console.log(`[SIBS] redirected the submitted payment ${paymentId} for booking ${payment?.bookingId}`);

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
    console.log('[SIBS] looks like this booking is already paid... don\'t request status again');
    return redirect(`/checkout/payment/${payment.bookingId}`);
  }

  console.log(
    `[SIBS] updating payment (submitted) and booking (AwaitingPayment) on form submit redirect for booking ${booking.id}`
  );
  await db.$transaction(async (db) => {
    await db.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.pending },
      data: {
        status: PaymentStatus.submitted
      }
    });

    await db.booking.update({
      where: { id: booking.id },
      data: {
        status: CheckoutStatus.AwaitingPayment
      }
    });
  });
  
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
      console.error('[SIBS] Status was impossible to retrieve so payment details will be missing... may as well just fail attempt');
      await db.$transaction(async (db) => {
        await db.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.fetchStatusFailed
          }
        });
    
        await db.booking.update({
          where: { id: booking.id },
          data: {
            status: CheckoutStatus.pending
          }
        });
      });
    }
  } catch (e) {
    console.log(e);
    //TODO: what is the status if getPaymentStatus fails?!?!
  }

  return redirect(`/checkout/payment/${payment.bookingId}`);
};
