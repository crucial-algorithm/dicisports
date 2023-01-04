import type { FetcherWithComponents } from '@remix-run/react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { Cart, Event } from '~/types';
import { H4, H5, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import Button from '~/components/shared/Button';
import InputError from '~/components/shared/form/InputError';

const actions = {
  checkout: 'checkout'
};

export default function DisplayCart({
  cart,
  event,
  error,
  fetcher,
  hash
}: {
  cart: Cart[];
  event: Event;
  error?: string;
  fetcher: FetcherWithComponents<any>;
  hash?: number;
}) {
  const { t } = useTranslation('checkout');
  let totalPrice = 0;

  return (
    <fetcher.Form method="post">
      <div className="flex flex-col border-2 border-b border-gray-500 rounded-md w-full h-full p-8 lg:p-12 md:ml-4">
        <H4>{t('Your Tickets')}</H4>
        <div className="mt-4 space-y-1">
          <H5>{event.name}</H5>
          <H6 className="dark:text-blueGray-500">
            <DisplayDate date={new Date(event.startAt as Date)} />
          </H6>
        </div>
        {cart
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((ticket, index: number) => (
            <div
              className="flex flex-col mt-8 w-full"
              key={ticket.id + ' - ' + index}
            >
              <div className="flex flex-row items-center justify-between">
                <H6>{ticket.raceName}</H6>
                <H6>{'x' + ticket.qtd}</H6>
              </div>
              <div className="flex flex-row items-center justify-between">
                <H6 className="dark:text-blueGray-500">
                  {ticket.racePrice + '€'}
                </H6>
                <H6 className="dark:text-blueGray-500">
                  {ticket.racePrice * ticket.qtd + '€'}
                </H6>
              </div>
            </div>
          ))}

        {cart.length !== 0 &&
          cart.map((c) => {
            totalPrice += c.racePrice * c.qtd;

            return totalPrice;
          }) && (
            <div className="flex flex-row items-center justify-between mt-4 py-4 border-t-2 border-grey-300">
              <H6>{t('Total')}</H6>
              <H6>{totalPrice + '€'}</H6>
            </div>
          )}

        <div className="flex flex-col items-center w-full">
          <input type="hidden" name="hash" value={hash} />
          <Button
            type="submit"
            name="actionId"
            value={actions.checkout}
            disabled={cart.length === 0}
            className="mt-4 w-full"
            id="checkout"
          >
            {t('Checkout now')}
          </Button>
          {error && (
            <InputError id="checkout-error" className="mt-2">
              {error}
            </InputError>
          )}
        </div>
      </div>
    </fetcher.Form>
  );
}
