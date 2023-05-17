import type { PaymentMethod, Payment } from '@prisma/client';
import { PaymentStatus } from '@prisma/client';

import { db } from '~/server/db.server';

import Id from '~/server/utils/Id.server';
import type { SibsWebHookSchema } from '~/types';

async function findSubmittedPayments(bookingId: string) {
  return await db.payment.findMany({
    where: {
      bookingId,
      expiresAt: { gte: new Date() },
      status: PaymentStatus.submitted
    }
  });
}

async function findExpiredPayments(bookingId: string) {
  return await db.payment.findMany({
    where: {
      bookingId,
      expiresAt: { lte: new Date() },
      status: PaymentStatus.submitted
    }
  });
}

async function findPayment(id: string) {
  return await db.payment.findUnique({
    where: { id }
  });
}


async function findPaymentByTransactionId(id: string): Promise<Payment | null> {
  return await db.payment.findUnique({
    where: { transactionId: id }
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
      status: PaymentStatus.pending,
      expiresAt: new Date('2099-12-31') // for now, until we figure out how SIBS is going to comunicate that
    }
  });
}

async function updatePaymentStatus(id: string, status: PaymentStatus) {
  return await db.payment.update({
    where: { id },
    data: {
      status
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


async function isBookingPaid(bookingId: string) {
  return (
    (
      await db.payment.findMany({
        where: { bookingId, status: PaymentStatus.paid }
      })
    ).length > 0
  );
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
  findPayment,
  findPaymentByTransactionId,
  findSubmittedPayments,
  findExpiredPayments,
  createPaymentRequest,
  addGatewayTransactionToPayment,
  pay,
  isBookingPaid,
  saveNotification,
  updatePaymentStatus
};
