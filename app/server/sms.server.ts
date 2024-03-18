import Config from './config.server';

// Sample success response
// -----------------------
// {
//   "data": {
//     "status": "accepted",
//     "part_id": [
//         "sms-5mvvwjradnmi"
//     ],
//     "number": "351937744117",
//     "channel": "sms",
//     "sms_id": "sms-5mvvwjradnmi",
//     "price": 0,
//     "credit": 0
// }
//}


export default async function sendSms(message: string, to: string) {
  const { SMS_ENDPOINT, SMS_APPLICATION_ID, SMS_APPLICATION_TOKEN } = Config();

  const response = await fetch(SMS_ENDPOINT, {
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

  if (response.status !== 200) {
    console.error('Failed to send SMS', response.status);
    console.error('SMS response message:', await response.text());
    throw new Error('Failed to send SMS');
  }

  console.log('SMS response:', await response.json());
}
