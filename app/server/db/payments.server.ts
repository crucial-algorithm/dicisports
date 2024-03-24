import type { Payment } from '@prisma/client';
import { PaymentStatus, PaymentMethod, CheckoutStatus } from '@prisma/client';

import { db } from '~/server/db.server';

import Id from '~/server/utils/Id.server';
import type { SibsWebHookSchema } from '~/types';
import { updateRaceParticipantsPrice } from '~/server/db/participant.server';


// State Management: requested -> pending -> submitted -> paid | failed
// 1.   requested:  We create the "blank" record with "requested" state before requesting
//                  checkout to SIBS, which is the instruction that starts the payment process
//                  (SIBS creates a transactionId against our payment id)
// 2.     pending:  Once the previous call to SIBS is returned, we update the payment record with
//                  SIBS transactionID and change status to "pending" (pending form submit)
// 3.   submitted:  When user submits the payment form, SIBS redirects to an action provided by us
//                  which will update the state to "submitted"
// 4. paid/failed:  Webhook will update the state accordingly


async function findSubmittedPayments(bookingId: string) {
  return db.payment.findMany({
    where: {
      bookingId,
      expiresAt: { gte: new Date() },
      status: PaymentStatus.submitted
    }
  });
}

async function findUnsuccessfulPayments(bookingId: string) {
  return db.payment.findMany({
    where: {
      bookingId,
      OR: [
        {
          expiresAt: { lte: new Date() },
          status: PaymentStatus.submitted
        },
        {
          status: {
            in: [
              PaymentStatus.failed,
              PaymentStatus.canceled,
              PaymentStatus.expired,
              PaymentStatus.fetchStatusFailed
            ]
          }
        }
      ]
    }
  });
}

async function findAllPaymentsForBooking(bookingId: string) {
  return db.payment.findMany({
    where: {
      bookingId
    }
  });
}

async function findPayment(id: string) {
  return db.payment.findUnique({
    where: { id }
  });
}

async function findPaymentByTransactionId(id: string): Promise<Payment | null> {
  return db.payment.findUnique({
    where: { transactionId: id }
  });
}

/**
 * 1st step: Method used to create a payment record to get an id to send to payment gateway.
 * Called just before the first API call to SIBS
 * @param bookingId
 * @param amount
 */
async function createPaymentRequest(bookingId: string, amount: number) {
  return db.$transaction(async (tx) => {
    await updateRaceParticipantsPrice(bookingId, tx);

    return tx.payment.create({
      data: {
        id: Id(),
        bookingId,
        amount: amount * 1000,
        status: PaymentStatus.requested
      }
    });
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

  return db.payment.update({
    where: { id },
    data: data
  });
}

/**
 * 3rd step: when form is submitted, SIBS redirects us to a dicisport route that calls this function to register
 * the payment option the user selected (and extrapolate the payment expiration time)
 *
 * @param id
 * @param method
 * @param entity
 * @param reference
 * @param referenceExpiresAt
 */
async function addPaymentMethodDetails(
  id: string,
  method: PaymentMethod,
  entity?: string,
  reference?: string,
  referenceExpiresAt?: string
) {
  console.log('[SIBS] Adding payment method details to payment record', id, method);

  let expiresAt: Date | null = null;

  if (method === PaymentMethod.REFERENCE && referenceExpiresAt) {
    expiresAt = new Date(referenceExpiresAt);
  }

  if (method === PaymentMethod.MBWAY) {
    expiresAt = new Date(Date.now() + 4 * 60 * 1000);
  }

  if (method === PaymentMethod.CARD) {
    // we wait until payment gateway gives up
    expiresAt = new Date('2099-12-31');
  }

  // only update if status is still in submitted (if it's already in fail or paid, it's because webhook was faster)
  return db.payment.updateMany({
    where: { id, status: PaymentStatus.submitted },
    data: {
      method,
      expiresAt: expiresAt ? expiresAt : undefined,
      mbEntity: entity ? entity : undefined,
      mbReference: reference ? reference : undefined
    }
  });
}

async function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  onlyFrom: PaymentStatus | null = null
) {
  const payment = await findPayment(id);

  if (onlyFrom) {
    return db.payment.updateMany({
      where: { id, status: onlyFrom },
      data: {
        status
      }
    });
  }

  return db.payment.update({
    where: { id },
    data: {
      status:
        payment?.status === PaymentStatus.paid ? PaymentStatus.paid : status
    }
  });
}

async function addReferenciaMultibancoInfo(
  id: string,
  reference: string,
  entity: string
) {
  return db.payment.update({
    where: { id },
    data: {
      mbReference: reference,
      mbEntity: entity
    }
  });
}

async function pay(gatewayTransactionId: string, method: PaymentMethod) {
  return db.payment.update({
    where: { transactionId: gatewayTransactionId },
    data: {
      status: PaymentStatus.paid,
      method
    }
  });
}

async function decline(gatewayTransactionId: string) {
  // intentionally not using a transaction here: we want to make sure we update the payment status
  // Eval: have a recover mechanism for transations that do not fully complete after SIBS notification is received
  await db.payment.update({
    where: { transactionId: gatewayTransactionId },
    data: {
      status: PaymentStatus.failed
    }
  });

  const payment = await findPaymentByTransactionId(gatewayTransactionId);

  if (!payment) {
    return;
  }

  return db.booking.update({
    where: { id: payment.bookingId },
    data: {
      status: CheckoutStatus.pending
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
      id: Id(),
      transactionId: json.transactionID,
      payload: json
    }
  });
}

async function resetPaymentStatus(id: string) {
  return db.payment.update({
    where: { id },
    data: {
      status: PaymentStatus.pending
    }
  });
}

async function findExpiredPaymentsNotYetNotified() {
  return db.payment.findMany({
    where: {
      status: 'submitted',
      expiresAt: {
        lt: new Date()
      },
      expiredWarningSentAt: null,
      booking: {
        status: {
          not: 'confirmed'
        },
        event: {
          status: 'published',
          startAt: {
            gt: new Date()
          }
        }
      }
    }
  });
}

async function updateExpiredWarningSentAt(id: string) {
  return db.payment.update({
    where: { id },
    data: {
      expiredWarningSentAt: new Date()
    }
  });
}

export {
  findPayment,
  findAllPaymentsForBooking,
  findPaymentByTransactionId,
  findSubmittedPayments,
  findUnsuccessfulPayments,
  findExpiredPaymentsNotYetNotified,
  createPaymentRequest,
  addGatewayDetailsToPayment,
  pay,
  decline,
  isBookingPaid,
  saveNotification,
  updatePaymentStatus,
  addReferenciaMultibancoInfo,
  addPaymentMethodDetails,
  resetPaymentStatus,
  updateExpiredWarningSentAt
};
