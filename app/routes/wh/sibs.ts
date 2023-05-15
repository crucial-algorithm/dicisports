import { createDecipheriv } from 'crypto';

import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/router';

import Config from '~/server/config.server';

import { pay, saveNotification } from '~/server/db/payments.server';
import type { SibsWebHookSchema } from '~/types';

export const action: ActionFunction = async ({ request }) => {
  const body = await request.text();

  const authTag = request.headers.get('x-authentication-tag') || '';
  const initVector = request.headers.get('x-initialization-vector') || '';
  const { SIBS_WEBHOOK_SECRET: secret } = Config();


  try {
    const payload = decrypt(body, secret, initVector, authTag);

    if (payload.paymentStatus === 'Success') {
      await pay(payload.transactionID, payload.paymentMethod);
    }

    await saveNotification(payload);

    return json({
      statusCode: 200,
      statusMessage: 'Success',
      notificationID: payload.notificationID
    });
  } catch(err: unknown) {
    console.log(err);
    return new Response(String(err), { status: 500 });
  }
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
