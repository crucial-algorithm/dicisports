import { createDecipheriv } from 'crypto';

import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/router';
import { CheckoutStatus, PaymentStatus } from '@prisma/client';

import Config from '~/server/config.server';
import { findBooking, findBookingCart } from '~/server/db/booking.server';

import { decline, findPayment, saveNotification } from '~/server/db/payments.server';
import type { SibsWebHookSchema } from '~/types';
import { assignParticipantsBibNumber, findUserBookingParticipants } from '~/server/db/participant.server';
import { findEvent } from '~/server/db/events.server';
import { sendBookingConfirmationEmail } from '~/server/email.server';
import { findUserById } from '~/server/db/users.server';
import { db } from '~/server/db.server';

export const action: ActionFunction = async ({ request }) => {
  console.log('SIBS webhook called');
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
    await saveNotification(payload);
    // using our transaction ID in case we didn't update the transaction id for the form redirect yet
    // (we are not sure about the order of calls SIBS we will use since their documentation states it's undeterministic)
    const payment = await findPayment(payload.merchant.transactionId);

    if (!payment) {
      console.log(
        `weird, we got a notification for an unknown payment: ${payload.notificationID}`
      );
    }

    if (payload.paymentStatus === 'Success') {
      db.$transaction(async (tx) => {
        await tx.payment.update({
          where: { transactionId: payload.transactionID },
          data: {
            status: PaymentStatus.paid,
            method: payload.paymentMethod
          }
        });

        if (payment) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: CheckoutStatus.confirmed
            }
          });
        }
      });
      
      if (payment) {
        const raceParticipants = await findUserBookingParticipants(payment.bookingId);

        if (!raceParticipants) {
          return new Response('No race participants', { status: 500 });
        }

        await assignParticipantsBibNumber(raceParticipants, raceParticipants[0].eventId as string);
        // await updateBookingStatus(payment.bookingId, CheckoutStatus.confirmed);
        await sendConfirmationEmail(payment.bookingId, raceParticipants[0].eventId as string);
      }
    }

    if (payload.paymentStatus === 'Declined') {
      await decline(payload.transactionID);
      console.log(`payment with SIBS transaction ${payload.transactionID} was declined`);
    }

  } catch(err: unknown) {
    console.error(err);
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
