import { createDecipheriv } from 'crypto';

import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/router';
import { CheckoutStatus, PaymentStatus } from '@prisma/client';

import Config from '~/server/config.server';
import { findBooking, findBookingCart } from '~/server/db/booking.server';

import { findPayment } from '~/server/db/payments.server';
import type { SibsWebHookSchema } from '~/types';
import { assignParticipantsBibNumber, findUserBookingParticipants } from '~/server/db/participant.server';
import { findEvent } from '~/server/db/events.server';
import { sendBookingConfirmationEmail } from '~/server/email.server';
import { findUserById } from '~/server/db/users.server';
import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';

export const action: ActionFunction = async ({ request }) => {
  console.log('[SIBS] webhook called');
  const body = await request.text();

  const authTag = request.headers.get('x-authentication-tag') || '';
  const initVector = request.headers.get('x-initialization-vector') || '';
  const { SIBS_WEBHOOK_SECRET: secret } = Config();
  let payload: SibsWebHookSchema;

  try {
    payload = decrypt(body, secret, initVector, authTag);
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }

  try {

    db.$transaction(async (tx) => {

      let payment = await tx.payment.findUnique({
        where: { id: payload.merchant.transactionId }
      });

      // lets check if we can find this payment in any way possible
      if (!payment) {
        console.log(
          `[SIBS] weird, we got a notification for an unknown payment: ${payload.notificationID}`
        );

        payment = await tx.payment.findUnique({
          where: { transactionId: payload.transactionID }
        });

        if (!payment) {
          return new Response(
            `Unknown payment: tx: ${payload.notificationID}, id: ${payload.merchant.transactionId}`,
            { status: 500 }
          );
        }
      }

      if (payload.paymentStatus === 'Declined') {
        console.log(`payment with SIBS transaction ${payload.transactionID} was declined [${payment?.bookingId}]`);

        await tx.payment.update({
          where: { transactionId: payload.transactionID },
          data: {
            status: PaymentStatus.failed
          }
        });

        await tx.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: CheckoutStatus.pending
          }
        });

        console.log('booking(s) updated to pending due to payment decline', payment.bookingId);

        return;
      }
      
      if (payload.paymentStatus !== 'Success') {
        console.error(
          `[SIBS] payment with SIBS transaction ${payload.transactionID} was neither declined nor successful [${payment.bookingId}]`
        );
        return;
      }

      console.log(
        `[SIBS] payment was successful... updating payment ${payload.transactionID} and booking status ${payment.bookingId}`
      );

      // add notification ID to payment
      await tx.payment.update({
        where: { transactionId: payload.transactionID },
        data: {
          notificationId: payload.notificationID
        }
      });

      // store notification for debbuging
      await tx.paymentNotification.create({
        data: {
          id: Id(),
          transactionId: payload.transactionID,
          payload
        }
      });

      // mark payment as paid
      await tx.payment.update({
        where: { transactionId: payload.transactionID },
        data: {
          status: PaymentStatus.paid,
          method: payload.paymentMethod
        }
      });

      // mark booking as confirmed
      if (payment.bookingId) {
        const x = await tx.booking.update({
          where: { id: payment.bookingId },
          data: {
            status: CheckoutStatus.confirmed
          }
        });

        console.log('[SIBS] booking(s) updated', x);
      } else {
        console.error('[SIBS] no booking found for payment', payment);
      }

    });


    // this block can run in an race condition with form submit callback... 
    // careful with updates to booking or payment status 
    if (payload.paymentStatus === 'Success') {
      const payment = await findPayment(payload.merchant.transactionId);
      
      if (payment) {
        const raceParticipants = await findUserBookingParticipants(payment.bookingId);

        if (raceParticipants) {
          await assignParticipantsBibNumber(raceParticipants, raceParticipants[0].eventId as string);
          await sendConfirmationEmail(payment.bookingId, raceParticipants[0].eventId as string);
        }
      }
    }

  } catch(err: unknown) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }

  return json({
    statusCode: 200,
    statusMessage: 'Success',
    notificationID: payload.notificationID
  });
};


function decrypt(encryptedText: string, key: string, iv: string, authTag: string): SibsWebHookSchema {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'base64'),
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const decryptedText = decipher.update(Buffer.from(encryptedText, 'base64'));

  return JSON.parse(decryptedText.toString()) as SibsWebHookSchema;
}

async function sendConfirmationEmail(bookingId: string, eventId: string) {
  const booking = await findBooking(bookingId);
  const event = await findEvent(eventId);
  const cart = await findBookingCart(bookingId);

  if (!booking) {
    return new Response('No booking', { status: 500 });
  }

  const user = await findUserById(booking.userId);

  if (user) {
    await sendBookingConfirmationEmail({
      emailAddress: user.email,
      event,
      booking,
      cart,
      userName: user.name
    });
  }
}
