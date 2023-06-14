import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '~/components/shared/Button';

import Main from '~/components/shared/Main';
import SearchField from '~/components/shared/SearchField';
import { requireUser } from '~/server/auth/session.server';
import { findDiscountCodesForOrganiser } from '~/server/db/discounts.server';
import { findOrganiser } from '~/server/db/organiser.server';
import type { DiscountCode } from '~/types';

export const handle = {
  i18n: ['discount-codes']
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const organiser = await findOrganiser(user.id);

  if (!organiser) {
    console.log('weird to be here without an organiser');
    return json({ discounts: [] });
  }

  const discounts = await findDiscountCodesForOrganiser(organiser.id);

  return json({ discounts });
};

function cellDiscountValue({ value, fixed }: DiscountCode) {
  return `${value / 1000}${fixed ? '€' : '%'}`;
}

export default function OrganiserDiscountCodesRoute() {
  const { discounts: existingDiscounts } = useLoaderData() as {
    discounts: DiscountCode[];
  };
  const [discounts, setDiscounts] = useState(existingDiscounts);
  const { t } = useTranslation('discount-codes');
  const emptyMessage =
    existingDiscounts.length > 0
      ? t('Empty results')
      : t('Create your 1st discount');

  function filter(value: string) {
    setDiscounts(
      existingDiscounts.filter(({ code }) =>
        code.toLowerCase().includes(value.toLowerCase().trim())
      )
    );
  }

  function cellState({ active }: DiscountCode) {
    return (
      <span
        className={clsx('rounded-2xl text-white py-2 px-8 text-sm', {
          'bg-gray-600': !active,
          'bg-emerald-600': active
        })}
      >
        {active ? t('Active') : t('Inactive')}
      </span>
    );
  }

  return (
    <Main>
      <div className="flex flex-row h-16 justify-between gap-4 mb-8 items-center">
        <div className="w-72">
          <SearchField name="search" onChange={filter} />
        </div>
        <Button name="create" type="button">
          {t('Create')}
        </Button>
      </div>
      <DataTable
        value={discounts}
        paginator
        rows={20}
        emptyMessage={emptyMessage}
      >
        <Column field="code" header={t('Code')} />
        <Column field="value" header={t('Value')} body={cellDiscountValue} />
        <Column field="active" header={t('State')} body={cellState} />
      </DataTable>
    </Main>
  );
}
