import { Role } from '@prisma/client';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { useActionData, useLoaderData } from '@remix-run/react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { json, redirect } from 'react-router';
import { ZodError, z } from 'zod';

import Button, { ButtonLink } from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';

import Main from '~/components/shared/Main';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import UploadForm from '~/components/shared/form/UploadForm';
import { requireUser } from '~/server/auth/session.server';
import {
  findDiscountCodeById, updateDiscountCode,
  upsertDiscountCode
} from '~/server/db/discounts.server';
import { findOrganizer } from '~/server/db/organizer.server';
import i18n from '~/server/i18n.server';
import type { DiscountCode } from '~/types';
import { badRequest } from '~/utils/misc';

type LoaderData = {
  discountCode: DiscountCode | null;
};

type ActionData = {
  errors?: {
    code?: string;
    value?: string;
  };
};

export const handle = {
  i18n: ['discount-codes']
};

export const action: ActionFunction = async ({ request, params }) => {
  const t = await i18n.getFixedT(request, 'discount-codes');

  const user = await requireUser(request);
  const discountCodeId = params.id as string;

  if (user.role !== Role.ORGANIZER) {
    return redirect('/');
  }

  if (!discountCodeId) {
    return redirect('/o/discount-codes');
  }

  const form = await request.formData();
  const organizer = await findOrganizer(user.id);
  const isUpdate = !!(await findDiscountCodeById(discountCodeId));

  const data = {
    code: form.get('code') as string,
    value: parseInt(form.get('discount-value') as string),
    fixed: form.get('value-type') === 'fixed'
  };

  const DiscountCodeSchema = z.object({
    code: z
      .string({ required_error: t('Field Required') })
      .min(1, { message: t('Field Required') }),
    value: z
      .number({ required_error: t('Field Required') })
      .positive({ message: t('Positive Number') }),
    fixed: z.boolean()
  });

  try {
    DiscountCodeSchema.parse(data);

    if (isUpdate) {
      await updateDiscountCode(discountCodeId, data.code, data.value, data.fixed);
    } else {
      await upsertDiscountCode({
        ...data,
        organizerId: organizer?.id as string,
        createdById: user.id
      });
    }

    return redirect(
      `/o/discount-codes?message=${t(
        isUpdate ? 'Success - Update' : 'Success - Create'
      )}`
    );
  } catch (e) {
    if (!(e instanceof ZodError)) {
      console.error(e);
      return badRequest({
        error: 'We dont know what happened'
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
  const user = await requireUser(request);
  const discountCodeId = params.id as string;

  if (user.role !== Role.ORGANIZER) {
    return redirect('/');
  }

  if (!discountCodeId) {
    return redirect('/o/discount-codes');
  }

  const discountCode = await findDiscountCodeById(discountCodeId);

  return json({
    discountCode
  });
};

export default function ManageDiscountCodesRoute() {
  const { discountCode } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation('discount-codes');
  const isUpdate = !!discountCode;

  return (
    <Main>
      <UploadForm method="post">
        <FormField
          label={t('Code')}
          className="w-full"
          error={actionData?.errors?.code}
        >
          <TextField
            name="code"
            defaultValue={discountCode?.code || ''}
            className="md:w-72"
          />
        </FormField>
        <FormField
          label={t('Value')}
          className="w-full"
          error={actionData?.errors?.value}
        >
          <PickValueType
            name="value-type"
            fixedValue={discountCode?.fixed || true}
            t={t}
          />
          <TextField
            className="mt-4 md:w-48"
            type="number"
            name="discount-value"
            defaultValue={discountCode?.value ? discountCode.value / 1000 : ''}
          />
        </FormField>
        <ButtonGroup>
          <ButtonLink variant="secondary" to="/o/discount-codes">
            {t('Cancel Button')}
          </ButtonLink>
          <Button name={isUpdate ? 'save-button' : 'create-button'} type="submit">
            {t(isUpdate ? 'Save Button' : 'Create Button')}
          </Button>
        </ButtonGroup>
      </UploadForm>
    </Main>
  );
}

function PickValueType({
  name,
  fixedValue = true,
  t
}: {
  name: string;
  fixedValue: boolean;
  t: TFunction;
}) {
  return (
    <fieldset>
      <div className="space-y-4">
        <div className="flex items-center">
          <input
            id={`${name}-fixed`}
            name={name}
            type="radio"
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
            defaultChecked={fixedValue}
            value="fixed"
          />
          <label
            htmlFor={`${name}-fixed`}
            className="ml-3 block text-sm font-medium text-gray-700"
          >
            {t('Fixed Value')}
          </label>
        </div>
        <div className="flex items-center">
          <input
            id={`${name}-non-fixed`}
            name={name}
            type="radio"
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
            defaultChecked={!fixedValue}
            value="non-fixed"
          />
          <label
            htmlFor={`${name}-fixed`}
            className="ml-3 block text-sm font-medium text-gray-700"
          >
            {t('Non-Fixed Value')}
          </label>
        </div>
      </div>
    </fieldset>
  );
}
