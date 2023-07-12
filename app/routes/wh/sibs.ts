import { createDecipheriv } from 'crypto';

import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/router';
import { CheckoutStatus } from '@prisma/client';

import Config from '~/server/config.server';
import { updateBookingStatus } from '~/server/db/booking.server';

import { decline, findPayment, pay, saveNotification } from '~/server/db/payments.server';
import type { SibsWebHookSchema } from '~/types';
import { assignParticipantsDorsalNumber, findUserBookingParticipants } from '~/server/db/participant.server';
import type { RaceParticipant } from '~/types';

export const action: ActionFunction = async ({ request }) => {
  console.log('SIBS webhook called');
  const body = await request.text();

  const authTag = request.headers.get('x-authentication-tag') || '';
  const initVector = request.headers.get('x-initialization-vector') || '';
  const { SIBS_WEBHOOK_SECRET: secret } = Config();
  let payload: SibsWebHookSchema | null = null;

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
      // update payment status with success
      await pay(payload.transactionID, payload.paymentMethod);
      if (payment) {
        const raceParticipants: RaceParticipant[] | null = await findUserBookingParticipants(payment.bookingId);

        if (!raceParticipants) {
          return new Response('No race participants', { status: 500 });
        }

        await assignParticipantsDorsalNumber(raceParticipants);
        await updateBookingStatus(payment.bookingId, CheckoutStatus.confirmed);
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
