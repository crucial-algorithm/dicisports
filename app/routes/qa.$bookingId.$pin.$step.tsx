import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';

import { getSession, getUser } from '~/server/auth/session.server';
import { findBookingByPin } from '~/server/db/booking.server';
import { findUserById } from '~/server/db/users.server';

// quick access route, to use in notifications (sms) so users get back to their booking

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUser(request);
  const bookingId = params.bookingId;
  const pin = params.pin;
  const step = params.step;

  if (!bookingId || !pin) {
    console.log('Quick access route accessed with invalid token');
    return redirect('/');
  }

  const booking = await findBookingByPin(bookingId, Number(pin));

  if (!booking) {
    console.log('Quick access route accessed with invalid booking');
    return redirect('/');
  }

  const userInBooking = await findUserById(booking.userId);
  const session = await getSession(request);

  if (!userInBooking) {
    console.log(`Quick access route accessed for booking ${booking.id} with invalid user ${booking.userId}`);
    return redirect('/');
  }

  // if user is already logged in, sign them out
  if (user) {
    session.signOut();
  }

  await session.signIn(userInBooking);
  const headers = new Headers();

  await session.signIn(userInBooking);
  await session.getHeaders(headers);

  if (step === 'info') {
    return redirect(`/checkout/info/${booking.id}`, { headers });
  }
 
  if (step === 'pay') {
    return redirect(`/checkout/payment/${booking.id}`, { headers });
  }

  // default to go to pay
  return redirect(`/checkout/payment/${booking.id}`, { headers });
};

export const meta: MetaFunction = () => {
  return {
    title: 'quick access route',
    description: 'This is a quick access route'
  };
};

// Define your component
export default async function QARoute() {
  return (
    <div>
        you should never see this... you can close the window if you do
    </div>
  );


}
