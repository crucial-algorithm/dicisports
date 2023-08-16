import * as React from 'react';
import { OrganizerStatus } from '@prisma/client';

import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { redirect } from 'react-router';
import { useTranslation } from 'react-i18next';
import { z, ZodError } from 'zod';

import { requireAdminUser } from '~/server/auth/session.server';
import {
  approveOrganizer,
  findOrganizerById,
  rejectOrganizer
} from '~/server/db/organizer.server';
import type { Organizer } from '~/types';
import ButtonGroup from '~/components/shared/ButtonGroup';
import Button, { ButtonLink } from '~/components/shared/Button';
import Main from '~/components/shared/Main';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';

import { badRequest } from '~/utils/misc';
import i18n from '~/server/i18n.server';
import OrganizerForm from '~/components/shared/OrganizerForm';
import Config from '~/server/config.server';

type LoaderData = {
  organizer: Organizer;
  defaultCommission: number;
};

export const handle = {
  i18n: ['organizer-form', 'admin']
};

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminUser(request);
  const t = await i18n.getFixedT(request, 'admin');

  const id = params.id as string;

  if (!id) {
    return redirect('/a/organizers');
  }

  const organizer = await findOrganizerById(id);

  if (!organizer || organizer.status !== OrganizerStatus.PENDING) {
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

      await approveOrganizer(id, commission);
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
  await requireAdminUser(request);

  const id = params.id as string;

  if (!id) {
    return redirect('/a/organizers');
  }

  const organizer = await findOrganizerById(id);

  if (!organizer || organizer.status !== OrganizerStatus.PENDING) {
    return redirect('/a/organizers');
  }
  
  const { DEFAULT_COMMISSION } = Config();

  return json({
    organizer,
    defaultCommission: DEFAULT_COMMISSION
  });
};

export default function ReviewOrganizerRoute() {
  const { organizer, defaultCommission } = useLoaderData() as LoaderData;
  const actionData = useActionData();
  const { t } = useTranslation('admin');

  return (
    <Main>
      <OrganizerForm organizer={organizer} readOnly={true} />
      <Form method="post">
        <FormField
          label={t('Commission')}
          error={actionData?.errors?.commission}
          className="w-44"
        >
          <TextField
            type="number"
            name="commission"
            placeholder="20"
            defaultValue={defaultCommission}
          />
        </FormField>

        <ButtonGroup>
          <ButtonLink type="button" variant="secondary" to="/a">
            {t('Cancel')}
          </ButtonLink>
          <Button
            variant="secondary"
            name="actionId"
            type="submit"
            value="reject"
          >
            {t('Reject')}
          </Button>
          <Button name="actionId" type="submit" value="approve">
            {t('Approve')}
          </Button>
        </ButtonGroup>
      </Form>
    </Main>
  );
}
