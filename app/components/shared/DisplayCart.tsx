import type { FetcherWithComponents } from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { Event, UICartRow } from '~/types';
import { H4, H5, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import InputError from '~/components/shared/form/InputError';

export default function DisplayCart({
  cart,
  event,
  error,
  fetcher,
  hash,
  children,
  action
}: {
  cart: UICartRow[];
  event: Event;
  error?: string;
  fetcher: FetcherWithComponents<any>;
  hash?: number;
  action?: string;
} & React.ComponentProps<'div'>) {
  const { t } = useTranslation('checkout');
  let totalPrice = 0;

  return (
    <fetcher.Form method="post" action={action}>
      <div className="flex flex-col border-2 border-b border-gray-500 rounded-md w-full h-full p-8 lg:p-12 md:ml-4">
        <H4>{t('Your Tickets')}</H4>
        <div className="mt-4 space-y-1">
          <H5>{event.name}</H5>
          <H6 className="dark:text-blueGray-500">
            <DisplayDate date={new Date(event.startAt as Date)} />
          </H6>
        </div>
        {cart
          .sort((a, b) => a.order - b.order)
          .map((ticket, index: number) => (
            <div
              className="flex flex-col mt-8 w-full"
              key={ticket.id + ' - ' + index}
            >
              <div className="flex flex-row items-center justify-between">
                <H6>{ticket.name}</H6>
                <H6>{'x' + ticket.qty}</H6>
              </div>
              <div className="flex flex-row items-center justify-between">
                <H6 className="dark:text-blueGray-500">{ticket.price + '€'}</H6>
                <H6 className="dark:text-blueGray-500">
                  {ticket.price * ticket.qty + '€'}
                </H6>
              </div>
            </div>
          ))}

        {cart.length !== 0 &&
          cart.map((c) => {
            totalPrice += c.price * c.qty;

            return totalPrice;
          }) && (
            <div className="flex flex-row items-center justify-between mt-4 py-4 border-t-2 border-grey-300">
              <H6>{t('Total')}</H6>
              <H6 data-cy="total-price">{totalPrice + '€'}</H6>
            </div>
          )}

        {children}
        <input type="hidden" name="hash" value={hash} />
        {error && (
            <InputError id="checkout-error" className="mt-2">
              {error}
            </InputError>
        )}

      </div>
    </fetcher.Form>
  );
}
