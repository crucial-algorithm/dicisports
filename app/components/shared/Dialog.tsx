import { XCircleIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import type { ReactElement } from 'react';
import React from 'react';

import Button from '~/components/shared/Button';

type DialogProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  PrimaryAction?: ReactElement;
  SecondaryAction?: ReactElement;
  onClose: (open: boolean) => void
} & React.ComponentProps<'div'>


export default function DiciDialog(
  { isOpen, title, description, PrimaryAction, SecondaryAction, className, onClose, children }: DialogProps) {

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-gray-500 opacity-50" />
        <Dialog.Content
          className={clsx('dialog-content md:dialog-content-desktop', className)}
        >
          <div className="dialog-title">
            <Dialog.Title className="text-lg">{title || ' '}</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close" className="hidden md:block">
                <XCircleIcon className="w-8" />
              </button>
            </Dialog.Close>
          </div>
          <div className="dialog-body">
            {description && (
              <Dialog.Description className="mt-2.5 mb-2.5 mr-5 ml-5">
                {description}
              </Dialog.Description>
            )}
            {children}
          </div>
          {(PrimaryAction || SecondaryAction) && (
            <div className={clsx(className, 'dialog-footer')}>
              {SecondaryAction}
              {PrimaryAction}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type ConfirmationDialogProps = {
  isOpen: boolean;
  title: string;
  question: string;
  primaryLabel: string;
  primaryVariant?: 'primary' | 'danger';
  secondaryLabel: string;
  onDismiss: () => void
  onConfirm: () => void
} & React.ComponentProps<'div'>


export function ConfirmationDialog({
  title,
  question,
  primaryLabel,
  primaryVariant = 'primary',
  secondaryLabel,
  isOpen,
  onDismiss,
  onConfirm,
  className
}: ConfirmationDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onDismiss}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-gray-500 opacity-50" />
        <Dialog.Content
          className={clsx(
            'dialog-content',
            className
          )}
        >
          <div className="dialog-title">
            <Dialog.Title className="text-lg">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close" className="hidden md:block">
                <XCircleIcon className="w-8" />
              </button>
            </Dialog.Close>
          </div>
          <div className="dialog-body">
            <Dialog.Description className="mt-2.5 mb-2.5">
              {question}
            </Dialog.Description>
          </div>
          <div className={clsx(className, 'dialog-footer')}>
            <Button variant="secondary" onClick={onDismiss}>{secondaryLabel}</Button>
            <Button variant={primaryVariant} onClick={onConfirm}>{primaryLabel}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
