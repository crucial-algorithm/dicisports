import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { DiscountCodeStatus } from '@prisma/client';

import { useLoaderData, useNavigate } from '@remix-run/react';
import clsx from 'clsx';
import type { DataTableRowClickEvent } from 'primereact/datatable';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ButtonLink } from '~/components/shared/Button';

import Main from '~/components/shared/Main';
import SearchField from '~/components/shared/SearchField';
import { requireUser } from '~/server/auth/session.server';
import { findDiscountCodesForOrganizer } from '~/server/db/discounts.server';
import { findOrganizer } from '~/server/db/organizer.server';
import type { DiscountCode } from '~/types';

export const handle = {
  i18n: ['discount-codes']
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);
  const organizer = await findOrganizer(user.id);

  if (!organizer) {
    console.log('weird to be here without an organizer');
    return json({ discounts: [] });
  }

  const discounts = await findDiscountCodesForOrganizer(organizer.id);

  return json({ discounts });
};

function cellDiscountValue({ value, fixed }: DiscountCode) {
  return `${value / 1000}${fixed ? '€' : '%'}`;
}

export default function OrganizerDiscountCodesRoute() {
  const { discounts: existingDiscounts } = useLoaderData() as {
    discounts: DiscountCode[];
  };

  const navigate = useNavigate();
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

  function cellState({ status, id }: DiscountCode) {
    const isDiscountActive = status === DiscountCodeStatus.active;

    return (
      <span
        id={`status-${id}`}
        className={clsx('rounded-2xl text-white py-2 px-8 text-sm', {
          'bg-gray-600': !isDiscountActive,
          'bg-emerald-600': isDiscountActive
        })}
      >
        {isDiscountActive ? t('Active') : t('Inactive')}
      </span>
    );
  }

  function handleOnRowClick(e: DataTableRowClickEvent) {
    navigate(e.data.id);
  }

  return (
    <Main>
      <div className="flex flex-row h-16 justify-between gap-4 mb-8 items-center">
        <div className="w-72">
          <SearchField name="search" onChange={filter} />
        </div>
        <ButtonLink id="new-discount" to="/o/discount-codes/new">
          {t('Create')}
        </ButtonLink>
      </div>
      <DataTable
        value={discounts}
        paginator
        rows={20}
        emptyMessage={emptyMessage}
        onRowClick={handleOnRowClick}
      >
        <Column field="code" bodyClassName="cursor-pointer" header={t('Code')} />
        <Column field="value" header={t('Value')} body={cellDiscountValue} />
        <Column field="status" header={t('State')} body={cellState} />
      </DataTable>
    </Main>
  );
}
