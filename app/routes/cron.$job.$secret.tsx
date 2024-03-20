import type { LoaderFunction } from '@remix-run/node';

import type { TFunction } from 'i18next';

import type { KCDHandle } from '~/types';

import Config from '~/server/config.server';

import {
  findExpiredPaymentsNotYetNotified,
  updateExpiredWarningSentAt
} from '~/server/db/payments.server';
import { findBookingParticipants } from '~/server/db/participant.server';
import { BadRequest, Unauthorized } from '~/server/utils/misc';
import sendSms from '~/server/sms.server';

import i18n from '~/server/i18n.server';

import { findBooking } from '~/server/db/booking.server';
import { createShortUrl } from '~/server/db/shortener.server';
import { findEvent } from '~/server/db/events.server';

export const handle: KCDHandle & { id: string; i18n: string[] } = {
  id: 'scheduler',
  i18n: []
};

// shortner route: redirect to target url

export const loader: LoaderFunction = async ({ request, params }) => {
  if (!params.secret) {
    throw Unauthorized('No secret provided');
  }

  if (params.secret !== Config().SCHEDULER_SECRET) {
    throw Unauthorized('Invalid secret');
  }

  if (!params.job) {
    throw BadRequest('No job provided');
  }

  if (['expired-payments'].includes(params.job) === false) {
    throw BadRequest('Invalid job');
  }

  const t = await i18n.getFixedT(request, 'batch');

  // run the job
  if (params.job === 'expired-payments') {
    await runExpiredPaymentsJob(t);
  }

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

async function runExpiredPaymentsJob(t: TFunction) {
  const expiredPayments = await findExpiredPaymentsNotYetNotified();
  const { DOMAIN_URL } = Config();
  const { href } = new URL(DOMAIN_URL);

  if (expiredPayments.length === 0) {
    console.log('no expired payments found. exiting');
    return;
  }

  expiredPayments.forEach(async (payment) => {
    const booking = await findBooking(payment.bookingId);

    if (!booking) {
      console.log(
        'CRON expired-payments: Booking not found',
        payment.bookingId
      );
      return;
    }

    const event = await findEvent(booking.eventId);

    // check if event is in the past or booking is closed
    if (
      !event ||
      (event.startAt && event.startAt < new Date()) ||
      (event.bookingStopsAt && event.bookingStopsAt < new Date()) ||
      event.status !== 'published'
    ) {
      console.log(
        'CRON expired-payments: Not sending message for event whose booking is no longer active',
        booking.id
      );
      return;
    }

    const participants = await findBookingParticipants(payment.bookingId);

    if (participants.length === 0) {
      console.error(
        'CRON expired-payments: No participants found for booking',
        payment.bookingId
      );
      return;
    }

    //TODO: set a primary contact for a booking, when it has multiple participants
    // defaulting to the 1st one
    const { participant } = participants[0];

    if (!participant.phone) {
      return;
    }

    // send SMS to participant
    const target = `/qa/${payment.bookingId}/${booking.pin}/pay`;
    const url = await createShortUrl(
      target,
      new Date((event.endAt as Date).getTime() + 1000 * 60 * 60 * 24 * 3) // 3 days after event end
    );

    console.log('sending SMS for ', participant.lastName, participant.phone);

    try {
      const result = await sendSms(
        t('Your Payment As Expired', { link: `${href}/s/${url}` }),
        participant.phone
      );

      console.log('What SMS service returned', result);
      await updateExpiredWarningSentAt(payment.id);
    } catch (e) {
      console.error('Error sending SMS', e);
    }
  });
}
