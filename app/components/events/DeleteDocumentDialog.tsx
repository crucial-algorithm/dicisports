import { useFetcher } from '@remix-run/react';
import * as React from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Document } from '@prisma/client';

import { ConfirmationDialog } from '~/components/shared/Dialog';
import { fetcherType } from '~/utils/misc';

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
      {},
      {
        method: 'post',
        action: `/o/event/${eventId}/doc/${document?.id}/remove`
      }
    );
  }

  useEffect(() => {
    const typeOfFetcher = fetcherType(fetcher);
    const fetcherData = fetcher.data as { ok: boolean } | undefined;

    if (typeOfFetcher === 'actionReload' && fetcherData && fetcherData.ok) {
      return onDismiss();
    }
  }, [fetcher, onDismiss]);

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
      className="cy-delete-dialog"
    />
  );
}
