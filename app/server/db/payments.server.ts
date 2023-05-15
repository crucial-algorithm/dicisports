import type { PaymentMethod } from '@prisma/client';
import { PaymentStatus } from '@prisma/client';

import { db } from '~/server/db.server';

import Id from '~/server/utils/Id.server';
import type { SibsWebHookSchema } from '~/types';

async function findPendingPayments(bookingId: string) {
  return await db.payment.findMany({
    where: {
      bookingId,
      expiresAt: { gte: new Date() },
      status: PaymentStatus.pending
    }
  });
}

async function findExpiredPayments(bookingId: string) {
  return await db.payment.findMany({
    where: {
      bookingId,
      expiresAt: { lte: new Date() },
      status: PaymentStatus.pending
    }
  });
}

/**
 * Method use to create a payment record to get an id to send to payment gateway
 * @param bookingId
 * @param amount
 */
async function createPaymentRequest(
  bookingId: string,
  amount: number
) {
  return await db.payment.create({
    data: {
      id: Id(),
      bookingId,
      amount: amount * 1000,
      status: PaymentStatus.requested
    }
  });
}

async function addGatewayTransactionToPayment(
  id: string,
  transactionId: string
) {
  return await db.payment.update({
    where: { id },
    data: {
      transactionId,
      status: PaymentStatus.pending
    }
  });
}

async function pay(gatewayTransactionId: string, method: PaymentMethod) {
  return await db.payment.update({
    where: { transactionId: gatewayTransactionId },
    data: {
      status: PaymentStatus.paid,
      method
    }
  });
}

async function saveNotification(json: SibsWebHookSchema) {
  // We are not using a transaction because we want to
  // have the best chance to save something, even if we loose
  // one of the operations here
  await db.payment.update({
    where: { transactionId: json.transactionID },
    data: {
      notificationId: json.notificationID
    }
  });
  await db.paymentNotification.create({
    data: {
      id: json.notificationID,
      transactionId: json.transactionID,
      payload: json
    }
  });
}

export {
  findPendingPayments,
  findExpiredPayments,
  createPaymentRequest,
  addGatewayTransactionToPayment,
  pay,
  saveNotification
};
