import Config from '~/server/config.server';
import { addGatewayTransactionToPayment, createPaymentRequest } from '~/server/db/payments.server';
import type { Booking, Event, UICartRow } from '~/types';
import { bookingAmount } from '~/utils/misc';

//  Example response from SIBS:
//  {
//    amount: { value: 5.5, currency: 'EUR' },
//    merchant: {
//      terminalId: '57677',
//      merchantTransactionId: 'e3JGLkwqtccTET6SX5oA'
//    },
//    transactionID: '2c2BARH8gm4BEibz1FCX',
//    transactionSignature:
//      'eyJ0eElkIjoiMmMyQkFSSDhnbTRCRWliejFGQ1giLCJtYyI6OTk5OTk5OSwidGMiOjU3Njc3fQ==.yHhVFvt5PSf4Ajv1Y5rWFNAbsl/UfC+MpIYS0nXnrKM=.WJikmpA00zfAX6ysBpRDmBL4l3dBCf0plMJmGN1Vn5aaGR3k3udwUuq+qEjgV0Z6',
//    formContext:
//      'eyJQYXltZW50TWV0aG9kIjpbIkNBUkQiLCJNQldBWSIsIlJFRkVSRU5DRSJdLCJUcmFuc2FjdGlvblNpZ25hdHVyZSI6ImV5SjBlRWxrSWpvaU1tTXlRa0ZTU0RobmJUUkNSV2xpZWpGR1ExZ2lMQ0p0WXlJNk9UazVPVGs1T1N3aWRHTWlPalUzTmpjM2ZRPT0ueUhoVkZ2dDVQU2Y0QWp2MVk1cldGTkFic2wvVWZDK01wSVlTMG5YbnJLTT0uV0ppa21wQTAwemZBWDZ5c0JwUkRtQkw0bDNkQkNmMHBsTUptR04xVm41YWFHUjNrM3Vkd1V1cStxRWpnVjBaNiIsIkFtb3VudCI6eyJBbW91bnQiOjUuNSwiQ3VycmVuY3kiOiJFVVIifSwiTWFuZGF0ZSI6eyJNYW5kYXRlQXZhaWxhYmxlIjpmYWxzZX0sIkFwaVZlcnNpb24iOiJ2MS0xIiwiTU9UTyI6ZmFsc2V9',
//    expiry: '2023-05-02T12:51:23.332+01:00',
//    tokenList: [],
//    paymentMethodList: ['CARD', 'MBWAY', 'REFERENCE'],
//    execution: {
//      startTime: '2023-05-02T11:41:23.804Z',
//      endTime: '2023-05-02T11:41:23.974Z'
//    },
//    returnStatus: {
//      statusCode: '000',
//      statusMsg: 'Success',
//      statusDescription: 'Success'
//    }
//  };

type TransactionResponse = {
  amount: { value: number; currency: 'EUR' };
  merchant: {
    terminalId: string;
    merchantTransactionId: string;
  };
  transactionID: string;
  transactionSignature: string;
  formContext: string;
  expiry: string;
  tokenList: [];
  paymentMethodList: ['CARD', 'MBWAY', 'REFERENCE'];
  execution: {
    startTime: string;
    endTime: string;
  };
  returnStatus: {
    statusCode: string;
    statusMsg: 'Success' | string;
    statusDescription: 'Success' | string;
  };
};

export async function createPayamentTransaction(
  booking: Booking,
  event: Event,
  cart: Array<UICartRow>
): Promise<TransactionResponse> {
  const {
    SIBS_API_TOKEN: token,
    SIBS_URL_ENDPOINT: url,
    SIBS_TERMINAL_ID: terminalId,
    SIBS_CLIENT_ID: clientId
  } = Config();

  const amount = bookingAmount(cart);
  const payment = await createPaymentRequest(booking.id, amount);

  const body = {
    merchant: {
      terminalId,
      channel: 'web',
      merchantTransactionId: payment.id
    },
    transaction: {
      transactionTimestamp: new Date().toISOString(),
      description: event.name,
      moto: false,
      paymentType: 'PURS',
      amount: {
        value: amount,
        currency: 'EUR'
      },
      paymentMethod: ['MBWAY', 'REFERENCE', 'CARD'],
      paymentReference: {
        initialDatetime: new Date().toISOString(),
        finalDatetime: new Date().toISOString(),
        maxAmount: {
          value: amount,
          currency: 'EUR'
        },
        minAmount: {
          value: amount,
          currency: 'EUR'
        },
        entity: '24000' // TODO: find out what this is
      }
    }
  };

  const headers = {
    Authorization: `Bearer ${token}`,
    'X-IBM-Client-Id': clientId,
    'content-type': 'application/json',
    accept: 'application/json'
  };

  const z = await fetch(url, {
    method: 'post',
    body: JSON.stringify(body),
    headers
  });
  const details = (await z.json()) as TransactionResponse;

  await addGatewayTransactionToPayment(payment.id, details.transactionID);
  return details;
}
