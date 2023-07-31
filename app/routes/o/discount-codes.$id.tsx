import { Role } from '@prisma/client';
import * as React from 'react';
import { useRef, useState } from 'react';
import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { json, redirect } from 'react-router';
import { z, ZodError } from 'zod';

import Button, { ButtonLink } from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';

import Main from '~/components/shared/Main';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import UploadForm from '~/components/shared/form/UploadForm';
import { requireUser } from '~/server/auth/session.server';
import {
  deleteDiscountCode,
  disableDiscountCode,
  enableDiscountCode,
  findDiscountCodeById,
  updateDiscountCode,
  upsertDiscountCode
} from '~/server/db/discounts.server';
import { findOrganizer } from '~/server/db/organizer.server';
import i18n from '~/server/i18n.server';
import type { DiscountCode } from '~/types';
import { badRequest } from '~/utils/misc';

import { ConfirmationDialog } from '~/components/shared/Dialog';

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

const actionIds = {
  delete: 'delete-discount',
  disable: 'disable-discount',
  enable: 'enable-discount'
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
  const actionId = form.get('actionId') as string;

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
      .positive({ message: t('Positive Number') })
      // Validate that non-fixed values don't exceed 100
      // "|| data.fixed" - A way to ignore <= 100 validation when value is fixed
      .refine((v) => (!data.fixed && v <= 100) || data.fixed, {
        message: t('Max 100%')
      }),
    fixed: z.boolean()
  });

  try {
    if (actionId === actionIds.delete) {
      await deleteDiscountCode(discountCodeId);

      return redirect(`/o/discount-codes?message=${t('Discount Deleted')}`);
    }

    if (actionId === actionIds.disable) {
      await disableDiscountCode(discountCodeId);

      return redirect(`/o/discount-codes?message=${t('Discount Disabled')}`);
    }

    if (actionId === actionIds.enable) {
      await enableDiscountCode(discountCodeId);

      return redirect(`/o/discount-codes?message=${t('Discount Enabled')}`);
    }

    DiscountCodeSchema.parse(data);

    if (isUpdate) {
      await updateDiscountCode(
        discountCodeId,
        data.code,
        data.value,
        data.fixed
      );
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

  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [disableModalOpen, setDisableModalOpen] = useState<boolean>(false);
  const [enableDiscountModalOpen, setEnableDiscountModalOpen] =
    useState<boolean>(false);
  const [actionId, setActionId] = useState<string>('');

  const { t } = useTranslation('discount-codes');
  const isUpdate = !!discountCode;

  const discountActionForm = useRef<HTMLFormElement>(null);

  function handleOpenDeleteDiscountModal() {
    setDeleteModalOpen(true);
    setActionId(actionIds.delete);
  }

  function handleOpenDisableDiscountModal() {
    setDisableModalOpen(true);
    setActionId(actionIds.disable);
  }

  function handleOpenEnableDiscountModal() {
    setEnableDiscountModalOpen(true);
    setActionId(actionIds.enable);
  }

  function handleResetDeleteDiscount() {
    setDeleteModalOpen(false);
    setActionId('');
  }

  function handleResetDisableDiscount() {
    setDisableModalOpen(false);
    setActionId('');
  }

  function handleResetEnableDiscount() {
    setEnableDiscountModalOpen(false);
    setActionId('');
  }

  function handleSubmitForm() {
    if (!discountActionForm.current) {
      return;
    }
    discountActionForm.current.submit();
  }

  function handleConfirmDelete() {
    handleSubmitForm();
    handleResetDeleteDiscount();
  }

  function handleConfirmHide() {
    handleSubmitForm();
    handleResetDisableDiscount();
  }

  function handleConfirmEnable() {
    handleSubmitForm();
    handleResetEnableDiscount();
  }

  return (
    <Main>
      <UploadForm method="post" ref={discountActionForm}>
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
            isFixedValue={discountCode ? discountCode.fixed : true}
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
          <Button
            name={isUpdate ? 'save-button' : 'create-button'}
            type="submit"
          >
            {t(isUpdate ? 'Save Button' : 'Create Button')}
          </Button>
        </ButtonGroup>
        {discountCode && (
          <ButtonGroup className="mt-24 border-t border-gray-300 dark:border-gray-300 pt-6">
            {discountCode.status === 'active' ? (
              <Button
                className="mb-4 md:mb-0"
                type="button"
                size="medium"
                variant="danger"
                name="disable-button"
                onClick={handleOpenDisableDiscountModal}
              >
                {t('Disable Button')}
              </Button>
            ) : (
              <Button
                className="mb-4 md:mb-0"
                type="button"
                size="medium"
                variant="danger"
                name="enable-button"
                onClick={handleOpenEnableDiscountModal}
              >
                {t('Enable Button')}
              </Button>
            )}

            <Button
              name="delete-button"
              type="button"
              variant="danger"
              onClick={handleOpenDeleteDiscountModal}
            >
              {t('Delete Button')}
            </Button>
          </ButtonGroup>
        )}

        <ConfirmationDialog
          isOpen={deleteModalOpen}
          title={t('Delete Discount X', { code: discountCode?.code })}
          question={t('Are you sure you want to delete discount code?')}
          primaryLabel={t('Delete Discount')}
          primaryVariant="danger"
          secondaryLabel={t("No, I don't want to delete")}
          onDismiss={handleResetDeleteDiscount}
          onConfirm={handleConfirmDelete}
          className="cy-delete-dialog"
        />

        <ConfirmationDialog
          isOpen={disableModalOpen}
          title={t('Disable Discount X', { code: discountCode?.code })}
          question={t('Are you sure you want to disable discount code?')}
          primaryLabel={t('Disable Discount')}
          primaryVariant="danger"
          secondaryLabel={t("No, I don't want to disable")}
          onDismiss={handleResetDisableDiscount}
          onConfirm={handleConfirmHide}
          className="cy-delete-dialog"
        />

        <ConfirmationDialog
          isOpen={enableDiscountModalOpen}
          title={t('Enable Discount X', { code: discountCode?.code })}
          question={t('Are you sure you want to enable discount code?')}
          primaryLabel={t('Enable Discount')}
          primaryVariant="danger"
          secondaryLabel={t("No, I don't want to enable")}
          onDismiss={handleResetEnableDiscount}
          onConfirm={handleConfirmEnable}
          className="cy-delete-dialog"
        />
      </UploadForm>

      <Form
        id="profile-form"
        method="post"
        noValidate
        aria-describedby="general-error"
        className="hidden"
        ref={discountActionForm}
      >
        <input type="hidden" name="actionId" value={actionId} />
        <input type="hidden" name="discount-code" value={discountCode?.id} />
      </Form>
    </Main>
  );
}

function PickValueType({
  name,
  isFixedValue = true,
  t
}: {
  name: string;
  isFixedValue: boolean;
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
            defaultChecked={isFixedValue}
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
            defaultChecked={!isFixedValue}
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
