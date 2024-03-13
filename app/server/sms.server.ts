import Config from './config.server';

export default function sendSms(message: string, to: string) {
  const { SMS_ENDPOINT, SMS_APPLICATION_ID, SMS_APPLICATION_TOKEN } = Config();

  return fetch(SMS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      application_id: Number(SMS_APPLICATION_ID),
      application_token: SMS_APPLICATION_TOKEN,
      number: Number(to),
      text: message,
      sender_id: 'gText',
      sender_id_value: 'Dicisports'
    })
  });
}
