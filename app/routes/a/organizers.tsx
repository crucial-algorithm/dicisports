import React from 'react';

import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import type { DataTableRowClickEvent } from 'primereact/datatable';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useTranslation } from 'react-i18next';
import { OrganizerStatus } from '@prisma/client';
import clsx from 'clsx';

import { requireAdminUser } from '~/server/auth/session.server';
import { findOrganizers } from '~/server/db/organizer.server';
import type { Organizer } from '~/types';
import Main from '~/components/shared/Main';
import { H3 } from '~/components/shared/typography';

type LoaderData = {
  organizers: Organizer[];
};

export const handle = {
  i18n: ['admin-organizers']
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireAdminUser(request);

  return json({
    organizers: await findOrganizers()
  });
};

export default function AdminIndexRoute() {
  const { organizers } = useLoaderData() as LoaderData;
  const { t } = useTranslation('admin-organizers');
  const navigate = useNavigate();

  function handleRowClick(e: DataTableRowClickEvent) {
    navigate(e.data.id);
  }

  function organizerStatusLabel(status: string) {
    const mapping: { [key: string]: string } = {
      APPROVED: t('Approved'),
      PENDING: t('Pending'),
      REJECTED: t('Rejected')
    };

    return mapping[status];
  }

  function cellState({ id, status }: Organizer) {
    return (
      <span
        id={`status-${id}`}
        className={clsx('rounded-2xl text-white py-2 px-8 text-sm', {
          'bg-gray-600': status === OrganizerStatus.PENDING,
          'bg-emerald-600': status === OrganizerStatus.APPROVED,
          'bg-rose-600': status === OrganizerStatus.REJECTED
        })}
      >
        {organizerStatusLabel(status)}
      </span>
    );
  }

  return (
    <Main>
      <H3 className="mb-4">{t('Organizers')}</H3>

      <DataTable
        value={organizers}
        emptyMessage={t('No Organizers')}
        onRowClick={handleRowClick}
      >
        <Column
          field="name"
          bodyClassName="cursor-pointer"
          header={t('Name')}
        />
        <Column
          field="contactName"
          bodyClassName="cursor-pointer"
          header={t('Contact Name')}
        />
        <Column
          field="email"
          bodyClassName="cursor-pointer"
          header={t('Email')}
        />
        <Column
          field="status"
          bodyClassName="cursor-pointer"
          header={t('State')}
          body={cellState}
        />
      </DataTable>
    </Main>
  );
}
