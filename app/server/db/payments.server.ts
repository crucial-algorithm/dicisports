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
 * 1st step: Method used to create a payment record to get an id to send to payment gateway.
 * Called just before the first API call to SIBS
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


/**
 * 2nd step: After creating a checkout in SIBS API, update our payment with info
 * returned by their API
 *
 * @param id
 * @param transactionId
 * @param expiresAt
 */
async function addGatewayDetailsToPayment(
  id: string,
  transactionId: string,
  expiresAt: Date
) {

  const record = await db.payment.findUnique({ where: { id: id } });

  if (!record) {
    return null;
  }

  let data: {
    transactionId: string;
    status?: PaymentStatus;
    expiresAt: Date;
  } = {
    transactionId,
    expiresAt
  };

  // Being extra carefull here: we don't want to risk re-writting state if SIBS calls our
  // webhook prior to calling our redirect
  if (record.status === PaymentStatus.requested) {
    data = { ...data, status: PaymentStatus.pending };
  }

  return await db.payment.update({
    where: { id },
    data: data
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

async function addReferenciaMultibancoInfo(
  id: string,
  reference: string,
  entity: string
) {
  return await db.payment.update({
    where: { id },
    data: {
      mbReference: reference,
      mbEntity: entity
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

async function decline(gatewayTransactionId: string) {
  return await db.payment.update({
    where: { transactionId: gatewayTransactionId },
    data: {
      status: PaymentStatus.failed
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
  addGatewayDetailsToPayment,
  pay,
  decline,
  isBookingPaid,
  saveNotification,
  updatePaymentStatus,
  addReferenciaMultibancoInfo
};
