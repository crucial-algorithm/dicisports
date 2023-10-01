import { Column } from 'primereact/column';
import type { DataTableRowClickEvent } from 'primereact/datatable';
import { DataTable } from 'primereact/datatable';
import * as React from 'react';
import { OrganizerStatus, Role  } from '@prisma/client';
import type { Event } from '@prisma/client';

import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigate } from '@remix-run/react';
import { redirect } from 'react-router';
import { useTranslation } from 'react-i18next';
import { z, ZodError } from 'zod';

import { dateFormatter } from '~/components/shared/DIsplayDate';

import { H3 } from '~/components/shared/typography';

import { getUser, requireAdminUser } from '~/server/auth/session.server';
import { findOrganizerEvents } from '~/server/db/events.server';
import {
  approveOrganizer,
  findOrganizerById,
  rejectOrganizer,
  updateOrganizerCommission
} from '~/server/db/organizer.server';
import type { Organizer, OrganizerType } from '~/types';
import ButtonGroup from '~/components/shared/ButtonGroup';
import Button, { ButtonLink } from '~/components/shared/Button';
import Main from '~/components/shared/Main';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';

import { badRequest, getDomainUrl } from '~/utils/misc';
import i18n from '~/server/i18n.server';
import OrganizerForm from '~/components/shared/OrganizerForm';
import Config from '~/server/config.server';
import { sendApprovedOrganizerProfileEmail } from '~/server/email.server';
import { findOrganizerTypes } from '~/server/db/reference.server';

type LoaderData = {
  organizer: Organizer;
  events: Array<Event>;
  defaultCommission: number;
  organizerTypes: OrganizerType[];
};

export const handle = {
  i18n: ['organizer-form', 'admin-organizers']
};

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminUser(request);
  const t = await i18n.getFixedT(request, 'admin-organizers');

  const id = params.id as string;

  if (!id) {
    return redirect('/a/organizers');
  }

  const organizer = await findOrganizerById(id);

  if (!organizer) {
    return redirect('/a/organizers');
  }

  const form = await request.formData();
  const approve = form.get('actionId') === 'approve';
  const commission = Number(form.get('commission') as string);

  const Schema = z.object({
    commission: z
      .number({ required_error: t('Required') })
      .nonnegative({ message: t('Between 0 And 100') })
      .max(100, t('Between 0 And 100'))
  });

  try {
    if (approve) {
      Schema.parse({ commission });

      if (organizer.status === OrganizerStatus.APPROVED) {
        await updateOrganizerCommission(id, commission);

        return redirect('/a/organizers');
      }

      await approveOrganizer(id, commission);
      await sendApprovedOrganizerProfileEmail({
        emailAddress: organizer.email,
        organizerName: organizer.name,
        domainUrl: getDomainUrl(request)
      });
    } else {
      await rejectOrganizer(id);
    }

    return redirect('/a/organizers');
  } catch (e) {
    if (!(e instanceof ZodError)) {
      const tc = await i18n.getFixedT(request, 'common');

      return badRequest({
        errors: { submit: tc('500 error message') }
      });
    }

    const errors: { [key: string]: string | undefined } = {};

    for (const error of (e as ZodError).errors) {
      errors[error.path[0]] = error.message;
    }

    return badRequest({ errors });
  }
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUser(request);
  const id = params.id as string;

  if (!user) {
    return redirect(`/login?a=review&o=${id}`);
  }

  if (user.role !== Role.ADMIN) {
    return redirect('/');
  }

  if (!id) {
    return redirect('/a/organizers');
  }

  const organizer = await findOrganizerById(id);

  const { DEFAULT_COMMISSION } = Config();
  const organizerTypes = await findOrganizerTypes();

  const events = await findOrganizerEvents(id);

  return json({
    organizer,
    events,
    defaultCommission: DEFAULT_COMMISSION,
    organizerTypes: organizerTypes.map((o) => {
      return { id: o.id, name: o.name };
    })
  });
};

export default function ReviewOrganizerRoute() {
  const { organizer, defaultCommission, organizerTypes, events } =
    useLoaderData() as LoaderData;
  const actionData = useActionData();
  const { t } = useTranslation('admin-organizers');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();

  function handleRowClick(e: DataTableRowClickEvent) {
    navigate(`/o/event/${e.data.id}`);
  }

  function startAt({ startAt }: Event) {
    return dateFormatter(new Date(startAt || 0), tc);
  }

  return (
    <Main>
      <OrganizerForm
        organizer={organizer}
        readOnly={true}
        organizerTypes={organizerTypes}
      />
      <Form method="post">
        <FormField
          label={t('Commission')}
          error={actionData?.errors?.commission}
          className="w-full"
          description={t('Only accept 2 decimal places')}
        >
          <TextField
            type="number"
            name="commission"
            defaultValue={organizer.commission || defaultCommission}
            className="w-full md:w-44"
          />
        </FormField>

        <ButtonGroup>
          <ButtonLink type="button" variant="secondary" to="/a/organizers">
            {t('Cancel')}
          </ButtonLink>
          {organizer.status !== OrganizerStatus.REJECTED && (
            <Button
              variant="secondary"
              name="actionId"
              type="submit"
              value="reject"
            >
              {t('Reject')}
            </Button>
          )}
          <Button
            name="actionId"
            type="submit"
            value="approve"
          >
            {organizer.status === OrganizerStatus.APPROVED
              ? t('Update')
              : t('Approve')}
          </Button>
        </ButtonGroup>
      </Form>

      <H3 className="mt-8">{t('Events')}</H3>
      <DataTable
        value={events}
        emptyMessage={t('No events')}
        onRowClick={handleRowClick}
      >
        <Column
          field="name"
          bodyClassName="cursor-pointer"
          header={t('Name')}
        />
        <Column
          field="startAt"
          bodyClassName="cursor-pointer"
          header={t('Date')}
          body={startAt}
        />
        <Column
          field="status"
          bodyClassName="cursor-pointer"
          header={t('State')}
        />
      </DataTable>

    </Main>
  );
}
