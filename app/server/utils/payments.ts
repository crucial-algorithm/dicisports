import type { Payment, Event } from '@prisma/client';

import Config from '~/server/config.server';
import { addGatewayDetailsToPayment, createPaymentRequest } from '~/server/db/payments.server';
import type { Booking, SibsStatusResponse, UICartRow } from '~/types';
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

function paymentReferenceIntervals() {
  const initial = new Date();
  const final = new Date();
  const { SIBS_MULTIBANCO_EXPIRATION_DAYS: days } = Config();

  final.setHours(0, 0, 0, 0);
  final.setDate(final.getDate() + days + 1);

  return { initial, final };
}

function getAuthHeaders() {
  const {
    SIBS_API_TOKEN: token,
    SIBS_CLIENT_ID: clientId
  } = Config();

  return {
    Authorization: `Bearer ${token}`,
    'X-IBM-Client-Id': clientId,
    'content-type': 'application/json',
    accept: 'application/json'
  };
}

export async function createPayamentTransaction(
  booking: Booking,
  event: Event,
  cart: Array<UICartRow>
): Promise<{ gatewayResponse: TransactionResponse; ourTransactionId: string }> {
  const {
    SIBS_URL_ENDPOINT: url,
    SIBS_TERMINAL_ID: terminalId,
    SIBS_MULTIBANCO_ENTITIY: entity
  } = Config();

  function handleAmount(): number {
    if (booking.appliedDiscount) {
      const [, value, fixed] = booking.appliedDiscount.split('|');

      return bookingAmount(cart, Number(value), JSON.parse(fixed)) / 1000;
    }

    return  bookingAmount(cart) / 1000;
  }
  
  const amount = handleAmount();
  const payment = await createPaymentRequest(booking.id, amount);
  const { initial, final } = paymentReferenceIntervals();

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
        initialDatetime: initial.toISOString(),
        finalDatetime: final.toISOString(),
        maxAmount: {
          value: amount,
          currency: 'EUR'
        },
        minAmount: {
          value: amount,
          currency: 'EUR'
        },
        entity
      }
    }
  };

  const r = await fetch(url, {
    method: 'post',
    body: JSON.stringify(body),
    headers: getAuthHeaders()
  });
  const details = (await r.json()) as TransactionResponse;

  await addGatewayDetailsToPayment(payment.id, details.transactionID, new Date(details.expiry));
  return { gatewayResponse: details, ourTransactionId: payment.id };
}


export async function getPaymentStatus(payment: Payment) {
  const { SIBS_CHECK_STATUS_ENDPOINT: url } = Config();

  const r = await fetch(
    url.replace('{{transactionID}}', String(payment.transactionId)),
    {
      method: 'get',
      headers: getAuthHeaders()
    }
  );

  if (!r.ok) {
    console.error('[SIBS] Get payment status didn\'t go well', r);
    return null;
  }

  const response = (await r.json()) as SibsStatusResponse;

  if (response?.returnStatus?.statusCode === '000') {
    console.log('[SIBS] Successuful get status', response);
    return response;
  } else {
    console.error('[SIBS] Unsuccessuful get status', response);
  }

  return null;
}
