import { XCircleIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import type { ReactElement } from 'react';
import React from 'react';

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
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={clsx(className, 'dialog-content')}>
          <Dialog.Title className="dialog-title">{title || ' '}</Dialog.Title>
          {description && (
            <Dialog.Description className="dialog-description">
              {description}
            </Dialog.Description>
          )}
          {children}
          <Dialog.Close asChild>
            <button className="dialog-close-btn" aria-label="Close">
              <XCircleIcon className="w-8" />
            </button>
          </Dialog.Close>

          {(PrimaryAction || SecondaryAction) && (
            <ActionsBar>
              <Dialog.Close asChild>
                {SecondaryAction}
              </Dialog.Close>
              <Dialog.Close asChild>
                {PrimaryAction}
              </Dialog.Close>
            </ActionsBar>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type ActionsBarProps = {
} & React.ComponentProps<'div'>

export function ActionsBar({ children }: ActionsBarProps) {
  return (<div className="w-full px-6 flex justify-end flex-wrap gap-4 justify-end absolute bottom-2">{children}</div>);
}
