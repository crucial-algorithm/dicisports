import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

import type { KCDHandle } from '~/types';

import Config from '~/server/config.server';
import { db } from '~/server/db.server';
import { findExpiredPayments } from '~/server/db/payments.server';
import { findBookingParticipants } from '~/server/db/participant.server';

export const handle: KCDHandle & { id: string; i18n: string[] } = {
  id: 'scheduler',
  i18n: []
};

// shortner route: redirect to target url

export const loader: LoaderFunction = async ({ request, params }) => {
  if (!params.secret) {
    throw new Response(null, {
      status: 404,
      statusText: 'No secret provided'
    });
  }

  if (params.secret !== Config().SCHEDULER_SECRET) {
    throw new Response(null, {
      status: 404,
      statusText: 'Invalid secret'
    });
  }

  if (!params.job) {
    throw new Response(null, {
      status: 400,
      statusText: 'No job provided'
    });
  }

  if (['expired-payments'].includes(params.job) === false) {
    throw new Response(null, {
      status: 400,
      statusText: 'Invalid job'
    });
  }

  // run the job
  await runExpiredPaymentsJob();

  return json({ success: true });
};

async function runExpiredPaymentsJob() {
  const expiredPayments = await findExpiredPayments();

  if (expiredPayments.length === 0) {
    return;
  }

  expiredPayments.forEach(async (payment) => {
    const participants = await findBookingParticipants(payment.bookingId);

    if (participants.length === 0) {
      console.error('CRON expired-payments: No participants found for booking', payment.bookingId);
      return;
    }

    //TODO: set a primary contact for a booking, when it has multiple participants
    // defaulting to the 1st one
    const { participant } = participants[0];

    console.log('sending SMS for ', participant.lastName, participant.phone);
  });

  console.log('expiredPayments', expiredPayments);
}

export default function CronJobsRoute() {
  return (
    <div>you should never see this... you can close the window if you do</div>
  );
}
