import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { Event } from '@prisma/client';
import type { TFunction } from 'i18next';

import type { UICartRow } from '~/types';
import { H4, H5, H6 } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import InputError from '~/components/shared/form/InputError';
import { bookingAmount } from '~/utils/misc';

export default function DisplayCart({
  cart,
  event,
  error,
  discountCodeError,
  appliedDiscount = null,
  showDiscountCodeInput = false,
  children
}: {
  cart: UICartRow[];
  event: Event;
  error?: string;
  discountCodeError?: string;
  appliedDiscount?: string | null;
  showDiscountCodeInput?: boolean;
} & React.ComponentProps<'div'>) {
  const { t } = useTranslation('checkout');
  const [discountCode, discountValue, isFixedDiscount] = appliedDiscount?.split(
    '|'
  ) || ['', '', ''];
  const subtotal = bookingAmount(cart);
  const totalPrice = bookingAmount(
    cart,
    discountValue ? Number(discountValue) : undefined,
    isFixedDiscount ? JSON.parse(isFixedDiscount) : false
  );

  return (
    <div className="flex flex-col border-2 border-b border-gray-500 rounded-md w-full p-8 lg:p-12 md:ml-4">
      <H4>{t('Your Tickets')}</H4>
      <div className="mt-4 space-y-1">
        <H5>{event.name}</H5>
        <H6 variant="secondary">
          <DisplayDate date={new Date(event.startAt as Date)} />
        </H6>
      </div>
      {cart
        .sort((a, b) => a.order - b.order)
        .map((ticket, index: number) => (
          <div
            className="flex flex-col mt-8 w-full"
            key={`${ticket.id}-${index}`}
          >
            <div className="flex flex-row items-center justify-between">
              <H6>{ticket.name}</H6>
              <H6>x{ticket.qty}</H6>
            </div>
            <div className="flex flex-row items-center justify-between">
              <H6 variant="secondary" id={`${ticket.raceId}-price`}>
                {ticket.price / 1000}€
              </H6>
              <H6 variant="secondary">{(ticket.price * ticket.qty) / 1000}€</H6>
            </div>
          </div>
        ))}

      {showDiscountCodeInput && (
        <>
          {!appliedDiscount ? (
            <>
              <div className="flex flex-row mt-8 justify-between gap-3">
                <input
                  type="text"
                  name="discount-code"
                  placeholder={t('Discount Code')}
                  defaultValue={discountCode}
                  className="input-text slim w-full"
                />
                <button
                  id="apply-discount"
                  name="actionId"
                  value="apply-discount"
                  type="submit"
                  className="dark:text-blueGray-500 bg-gray-100 dark:bg-gray-800 p-4 rounded-md font-medium"
                >
                  {t('Apply Discount')}
                </button>
              </div>
              {discountCodeError && (
                <InputError id="checkout-error" className="mt-2">
                  {discountCodeError}
                </InputError>
              )}
            </>
          ) : (
            <div className="mt-8" data-cy="discount-info">
              <DisplayAppliedDiscount
                code={discountCode}
                value={Number(discountValue)}
                isFixedDiscount={JSON.parse(isFixedDiscount)}
                t={t}
              />
            </div>
          )}
        </>
      )}

      {(totalPrice > 0 || (totalPrice === 0 && appliedDiscount)) && (
        <div className="flex flex-col gap-y-2 mt-4 py-4 border-t-2 border-grey-300">
          {appliedDiscount && (
            <>
              <div className="flex flex-row items-center justify-between">
                <H6 className="text-gray-400 dark:text-blueGray-500">
                  {t('Subtotal')}
                </H6>
                <H6
                  className="text-gray-400 dark:text-blueGray-500"
                  data-cy="subtotal-price"
                >
                  {subtotal / 1000}€
                </H6>
              </div>
              <div className="flex flex-row items-center justify-between">
                <H6 className="text-gray-400 dark:text-blueGray-500">
                  {t('Discount')}
                </H6>
                <H6
                  className="text-gray-400 dark:text-blueGray-500"
                  data-cy="discount"
                >
                  {(totalPrice - subtotal) / 1000}€
                </H6>
              </div>
            </>
          )}
          <div className="flex flex-row items-center justify-between mt-2">
            <H6>{t('Total')}</H6>
            <H6 data-cy="total-price">{totalPrice / 1000}€</H6>
          </div>
        </div>
      )}

      {children}

      {error && (
        <InputError id="checkout-error" className="mt-2">
          {error}
        </InputError>
      )}
    </div>
  );
}

function DisplayAppliedDiscount({
  code,
  value,
  isFixedDiscount,
  t
}: {
  code: string;
  value: number;
  isFixedDiscount: boolean;
  t: TFunction;
}) {
  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex flex-row justify-between">
        <H6>{t('Applied Discount')}</H6>
        <H6>{`-${value / 1000}${isFixedDiscount ? '€' : '%'}`}</H6>
      </div>
      <div className="flex flex-row justify-between">
        <H6 className="dark:text-blueGray-500">{code}</H6>
        <button
          type="submit"
          name="actionId"
          value="remove-discount"
          className="dark:text-blueGray-500"
        >
          {t('Remove')}
        </button>
      </div>
    </div>
  );
}
