import { createDecipheriv } from 'crypto';

import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/router';

export const action: ActionFunction = async ({ request }) => {
  const body = await request.text();

  const authTag = request.headers.get('x-authentication-tag') || '';
  const initVector = request.headers.get('x-initialization-vector') || '';
  const secret = 'O0Bur9uhZkS54NkwFhVyeutED6DhLbOQUBDt3i3W/C4=';


  try {
    const payload = decrypt(body, secret, initVector, authTag);

    // TODO: mark payment as fullfield

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

type SibsWebHookSchema = {
  returnStatus: { statusMsg: string; statusCode: string };
  paymentStatus: 'Success' | 'Error';
  paymentMethod: 'MBWAY' | 'REFERENCE' | 'CARD';
  transactionID: string;
  amount: { currency: 'EUR'; value: number };
  merchant: { terminalId: number };
  paymentType: string;
  notificationID: string
};
