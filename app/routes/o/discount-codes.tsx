import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Role } from '@prisma/client';

import {
  Form,
  useActionData,
  useLoaderData,
  useNavigate
} from '@remix-run/react';
import clsx from 'clsx';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ButtonLink } from '~/components/shared/Button';

import Main from '~/components/shared/Main';
import SearchField from '~/components/shared/SearchField';
import { requireUser } from '~/server/auth/session.server';
import {
  deleteDiscountCode,
  findDiscountCodesForOrganizer,
  disableDiscountCode,
  enableDiscountCode
} from '~/server/db/discounts.server';
import { findOrganizer } from '~/server/db/organizer.server';
import type { DiscountCode } from '~/types';
import { ConfirmationDialog } from '~/components/shared/Dialog';
import i18n from '~/server/i18n.server';
import { ShareIcon } from '@heroicons/react/24/solid';
import {
  EyeIcon,
  EyeSlashIcon,
  PencilIcon, PencilSquareIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

export const handle = {
  i18n: ['discount-codes']
};

type ResponseFeedback = {
  severity: 'error' | 'success' | 'info' | 'warn';
  message: string;
};

export const action: ActionFunction = async ({ request }) => {
  const user = await requireUser(request);
  const t = await i18n.getFixedT(request, 'discount-codes');

  if (user.role !== Role.ORGANIZER) {
    return redirect('/');
  }

  const form = await request.formData();
  const actionId = form.get('actionId') as string;
  const discountCodeId = form.get('discount-code') as string;

  let feedback: ResponseFeedback | undefined;

  try {
    if (actionId === actionIds.delete) {
      await deleteDiscountCode(discountCodeId);
      feedback = { severity: 'success', message: t('Discount Deleted') };
    }

    if (actionId === actionIds.disable) {
      await disableDiscountCode(discountCodeId);
      feedback = { severity: 'success', message: t('Discount Disabled') };
    }

    if (actionId === actionIds.enable) {
      await enableDiscountCode(discountCodeId);
      feedback = { severity: 'success', message: t('Discount Enabled') };
    }

    return json({ feedback });
  } catch (e) {
    const mapping: { [key: string]: string } = {
      'enable-discount': t('Enable'),
      'disable-discount': t('Disable'),
      'delete-discount': t('Remove')
    };

    feedback = {
      severity: 'error',
      message: t('Error X', { action: mapping[actionId] })
    };

    return json({ feedback });
  }
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

const actionIds = {
  delete: 'delete-discount',
  disable: 'disable-discount',
  enable: 'enable-discount'
};

export default function OrganizerDiscountCodesRoute() {
  const { discounts: existingDiscounts } = useLoaderData() as {
    discounts: DiscountCode[];
  };
  const actionData = useActionData();

  const navigate = useNavigate();
  const [discounts, setDiscounts] = useState(existingDiscounts);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [disableModalOpen, setDisableModalOpen] = useState<boolean>(false);
  const [enableDiscountModalOpen, setEnableDiscountModalOpen] =
    useState<boolean>(false);
  const [selectedDiscount, setSelectedDiscount] = useState<DiscountCode | null>(
    null
  );
  const [actionId, setActionId] = useState<string>('');

  const toast = useRef<Toast>(null);
  const feedback = actionData?.feedback;

  const discountActionForm = useRef<HTMLFormElement>(null);

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

  function ActionsBody(discount: DiscountCode) {
    return (
      <div className="flex flex-row items-center gap-x-4">
        <button
          id={discount.id}
          name={`delete-discount-${discount.id}`}
          onClick={handleOpenDeleteDiscountModal}
        >
          <TrashIcon className="h-6 w-6 m-0 inline-block" />
        </button>
        {discount.active ? (
          <button
            id={discount.id}
            name={`disable-discount-${discount.id}`}
            onClick={handleOpenDisableDiscountModal}
          >
            <EyeSlashIcon className="h-6 w-6 m-0 inline-block" />
          </button>
        ) : (
          <button
            id={discount.id}
            name={`enable-discount-${discount.id}`}
            onClick={handleOpenEnableDiscountModal}
          >
            <EyeIcon className="h-6 w-6 m-0 inline-block" />
          </button>
        )}
        <button
          type="button"
          id={discount.id}
          name={`edit-discount-${discount.id}`}
          onClick={handleEditDiscountCode}
        >
          <PencilSquareIcon className="h-6 w-6 m-0 inline-block" />
        </button>
      </div>
    );
  }

  function handleEditDiscountCode(e: React.MouseEvent) {
    navigate(e.currentTarget.id);
  }

  function findDiscountCode(id: string): DiscountCode {
    return discounts.find((d) => d.id === id) as DiscountCode;
  }

  function handleOpenDeleteDiscountModal(e: React.MouseEvent) {
    setDeleteModalOpen(true);
    setSelectedDiscount(findDiscountCode(e.currentTarget.id));
    setActionId(actionIds.delete);
  }

  function handleOpenDisableDiscountModal(e: React.MouseEvent) {
    setDisableModalOpen(true);
    setSelectedDiscount(findDiscountCode(e.currentTarget.id));
    setActionId(actionIds.disable);
  }

  function handleOpenEnableDiscountModal(e: React.MouseEvent) {
    setEnableDiscountModalOpen(true);
    setSelectedDiscount(findDiscountCode(e.currentTarget.id));
    setActionId(actionIds.enable);
  }

  function handleResetDeleteDiscount() {
    setDeleteModalOpen(false);
    setSelectedDiscount(null);
    setActionId('');
  }

  function handleResetDisableDiscount() {
    setDisableModalOpen(false);
    setSelectedDiscount(null);
    setActionId('');
  }

  function handleResetEnableDiscount() {
    setEnableDiscountModalOpen(false);
    setSelectedDiscount(null);
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
      >
        <Column field="code" header={t('Code')} />
        <Column field="value" header={t('Value')} body={cellDiscountValue} />
        <Column field="active" header={t('State')} body={cellState} />
        <Column body={ActionsBody} />
      </DataTable>

      <ConfirmationDialog
        isOpen={deleteModalOpen}
        title={t('Delete Discount X', { code: selectedDiscount?.code })}
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
        title={t('Disable Discount X', { code: selectedDiscount?.code })}
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
        title={t('Enable Discount X', { code: selectedDiscount?.code })}
        question={t('Are you sure you want to enable discount code?')}
        primaryLabel={t('Enable Discount')}
        primaryVariant="danger"
        secondaryLabel={t("No, I don't want to enable")}
        onDismiss={handleResetEnableDiscount}
        onConfirm={handleConfirmEnable}
        className="cy-delete-dialog"
      />

      <Form
        id="profile-form"
        method="post"
        noValidate
        aria-describedby="general-error"
        className="hidden"
        ref={discountActionForm}
      >
        <input type="hidden" name="actionId" value={actionId} />
        <input
          type="hidden"
          name="discount-code"
          value={selectedDiscount?.id}
        />
      </Form>
    </Main>
  );
}
