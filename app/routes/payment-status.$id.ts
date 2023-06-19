import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/router';

import { findPayment } from '~/server/db/payments.server';
import i18n from '~/server/i18n.server';

export const loader: LoaderFunction = async ({ request, params }) => {
  const id = params.id as string;
  const payment = await findPayment(id);
  const t = await i18n.getFixedT(request, 'checkout');

  if (!payment) {
    return json({ success: false, code: 100, message: t('Payment not found') });
  }

  return json({ success: true, payment });
};
