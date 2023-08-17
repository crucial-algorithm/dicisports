import React from 'react';

import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import type { DataTableRowClickEvent } from 'primereact/datatable';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { useTranslation } from 'react-i18next';

import { requireAdminUser } from '~/server/auth/session.server';
import { findPendingOrganizers } from '~/server/db/organizer.server';
import type { Organizer } from '~/types';
import Main from '~/components/shared/Main';
import { H3 } from '~/components/shared/typography';

type LoaderData = {
  pendingOrganizers: Organizer[]
}

export const handle = {
  i18n: ['admin-organizers']
};

export const loader: LoaderFunction = async({ request }) => {
  await requireAdminUser(request);


  return json({
    pendingOrganizers:  await findPendingOrganizers()
  });
};

export default function AdminIndexRoute() {
  const { pendingOrganizers } = useLoaderData() as LoaderData;
  const { t } = useTranslation('admin-organizers');
  const navigate = useNavigate();

  function handleRowClick(e: DataTableRowClickEvent) {
    navigate(e.data.id);
  }

  return (
    <Main>
      <H3 className="mb-4">{t('Review Organizers')}</H3>

      <DataTable
        value={pendingOrganizers}
        paginator
        rows={20}
        emptyMessage={t('No Pending Organizers')}
        onRowClick={handleRowClick}
      >
        <Column
          field="name"
          bodyClassName="cursor-pointer"
          header={t('Name')}
        />
        <Column
          field="email"
          bodyClassName="cursor-pointer"
          header={t('Email')}
        />
      </DataTable>
    </Main>
  );
}
