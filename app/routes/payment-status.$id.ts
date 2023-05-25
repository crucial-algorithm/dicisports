import { PaymentMethod, PaymentStatus } from '@prisma/client';
import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/router';

import { addReferenciaMultibancoInfo, findPayment, updatePaymentStatus } from '~/server/db/payments.server';
import i18n from '~/server/i18n.server';
import { getPaymentStatus } from '~/server/utils/payments';

export const loader: LoaderFunction = async ({ request, params }) => {
  const id = params.id as string;
  let payment = await findPayment(id);
  const t = await i18n.getFixedT(request, 'checkout');

  if (!payment) {
    return json({ success: false, code: 100, message: t('Payment not found') });
  }

  if (payment.status === PaymentStatus.paid) {
    return json({ success: true, payment });
  }

  const status = await getPaymentStatus(payment);

  if (!status) {
    return json({ success: false, code: 200, message: t('Could not retrieve status from payment gateway') });
  }

  if (status.paymentStatus === 'Declined') {
    await updatePaymentStatus(id, PaymentStatus.failed);
  }

  if (status.paymentStatus === 'Success') {
    await updatePaymentStatus(id, PaymentStatus.paid);
  }

  if (
    status.paymentMethod === PaymentMethod.REFERENCE &&
    status.paymentStatus !== 'Declined' &&
    !payment.mbReference
  ) {
    await addReferenciaMultibancoInfo(
      payment.id,
      status.paymentReference.reference,
      status.paymentReference.entity
    );
    payment = await findPayment(id);
  }

  return json({ success: true, payment });
};
