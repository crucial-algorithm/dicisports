import { useFetcher } from '@remix-run/react';
import * as React from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmationDialog } from '~/components/shared/Dialog';
import type { Race } from '~/types';

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
  const fetcher = useFetcher();

  function handleSubmit() {
    fetcher.submit(
      { actionId: 'delete', raceId: race?.id as string },
      {
        method: 'post',
        action: `/o/race/${eventId}/manage`,
        encType: 'multipart/form-data'
      }
    );
  }

  useEffect(() => {
    if (fetcher.type === 'actionReload' && fetcher.data.ok) {
      onDismiss();
    }
  }, [fetcher, onDismiss]);

  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={t('Delete Race X', { name: race?.name })}
      question={t('Are you sure you want to delete race?')}
      primaryLabel={t('Delete')}
      secondaryLabel={t('Ignore')}
      onDismiss={onDismiss}
      onConfirm={handleSubmit}
    />
  );
}
