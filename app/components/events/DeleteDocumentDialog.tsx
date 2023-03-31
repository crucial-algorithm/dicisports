import { useFetcher } from '@remix-run/react';
import * as React from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmationDialog } from '~/components/shared/Dialog';
import type { Document } from '~/types';

const RESOURCES_NS = 'create-event-form';

export default function DeleteDocumentDialog(props: {
  document: Document;
  isOpen: boolean;
  onDismiss: () => void;
  eventId: string;
}) {
  const { t } = useTranslation(RESOURCES_NS);

  const { document, isOpen, onDismiss, eventId } = props;
  const fetcher = useFetcher();

  function handleSubmit() {
    fetcher.submit(
      { actionId: 'delete', documentId: document.id },
      {
        method: 'post',
        action: `/o/document/${eventId}/manage`,
        encType: 'multipart/form-data'
      }
    );
  }

  useEffect(() => {
    if (fetcher.type === 'actionReload' && fetcher.data.ok) {
      return onDismiss();
    }
  });

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={t('Delete Document X', { name: document?.label })}
      question={t('Are you sure you want to delete document?')}
      primaryLabel={t('Delete Document')}
      primaryVariant="danger"
      secondaryLabel={t('Ignore')}
      onDismiss={onDismiss}
      onConfirm={handleSubmit}
    />
  );
}
