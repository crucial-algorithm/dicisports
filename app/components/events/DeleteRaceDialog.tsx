import { useFetcher } from '@remix-run/react';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Race } from '@prisma/client';

import DiciDialog, { ConfirmationDialog } from '~/components/shared/Dialog';
import Button from '~/components/shared/Button';
import { fetcherType } from '~/utils/misc';

const RESOURCES_NS = 'create-event-form';

export default
function DeleteRaceDialog(props: {
  isOpen: boolean;
  onDismiss: () => void;
  race?: Race;
  eventId: string;
}) {
  const { t } = useTranslation(RESOURCES_NS);
  const { isOpen, onDismiss, race, eventId } = props;
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleSubmit() {
    setErrorMessage(null);
    fetcher.submit(
      {},
      {
        method: 'post',
        action: `/o/event/${eventId}/race/${race?.id}/remove`
      }
    );
  }

  useEffect(() => {
    const typeOfFetcher = fetcherType(fetcher);

    if (typeOfFetcher === 'actionReload') {
      if (fetcher.data?.ok) {
        setErrorMessage(null);
        onDismiss();
      } else if (fetcher.data?.error) {
        setErrorMessage(t(fetcher.data.error));
      }
    }
  }, [fetcher, onDismiss, t]);

  // Prepare the question text, including error message if present
  const questionText = errorMessage 
    ? t(errorMessage)
    : t('Are you sure you want to delete race?');

  function handleDismiss() {
    setErrorMessage(null);
    onDismiss();
  }

  // If there's an error message, show an information dialog with just an OK button
  if (errorMessage) {
    return (
      <DiciDialog
        isOpen={isOpen}
        title={t('Delete Race X', { name: race?.name })}
        description={questionText}
        onClose={handleDismiss}
        PrimaryAction={
          <Button type="button" variant="primary" onClick={handleDismiss}>
            {t('OK')}
          </Button>
        }
      />
    );
  }

  // Otherwise, show the confirmation dialog with Delete and Ignore buttons
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={t('Delete Race X', { name: race?.name })}
      question={questionText}
      primaryLabel={t('Delete')}
      secondaryLabel={t('Ignore')}
      onDismiss={handleDismiss}
      onConfirm={handleSubmit}
      primaryVariant="primary"
    />
  );
}
