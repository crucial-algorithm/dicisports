import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { DiscountCodeStatus, Role } from '@prisma/client';

import {
  Form,
  useActionData,
  useLoaderData,
  useNavigate
} from '@remix-run/react';
import clsx from 'clsx';
import type { DataTableRowClickEvent } from 'primereact/datatable';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { EyeIcon, EyeSlashIcon, TrashIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ButtonLink } from '~/components/shared/Button';

import Main from '~/components/shared/Main';
import SearchField from '~/components/shared/SearchField';
import { requireUser } from '~/server/auth/session.server';
import {
  deleteDiscountCode,
  disableDiscountCode,
  enableDiscountCode,
  findDiscountCodesForOrganizer
} from '~/server/db/discounts.server';
import { findOrganizer } from '~/server/db/organizer.server';
import type { DiscountCode } from '~/types';
import { ConfirmationDialog } from '~/components/shared/Dialog';
import i18n from '~/server/i18n.server';

export const handle = {
  i18n: ['discount-codes']
};

type ResponseFeedback = {
  severity: 'error' | 'success' | 'info' | 'warn';
  message: string;
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
  const actionData = useActionData();

  const navigate = useNavigate();
  const [discounts, setDiscounts] = useState(existingDiscounts);

  const toast = useRef<Toast>(null);
  const feedback = actionData?.feedback;

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

  function cellState({ status }: DiscountCode) {
    const isDiscountActive = status === DiscountCodeStatus.active;

    return (
      <span
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

  useEffect(() => {
    if (!toast.current || !feedback) {
      return;
    }

    toast.current.show({
      severity: feedback.severity,
      detail: feedback.message,
      life: 3000
    });
  }, [toast, feedback]);

  return (
    <Main>
      <Toast ref={toast} />
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
        className="cursor-pointer"
      >
        <Column field="code" header={t('Code')} />
        <Column field="value" header={t('Value')} body={cellDiscountValue} />
        <Column field="status" header={t('State')} body={cellState} />
      </DataTable>
    </Main>
  );
}
