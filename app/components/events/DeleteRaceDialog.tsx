import { useFetcher } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';
import { Spacer } from '~/components/shared/Spacer';
import { H3, Paragraph } from '~/components/shared/typography';
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
    <div
      data-reach-dialog-overlay={true}
      className={clsx({
        'hidden ': !isOpen,
        'z-50 flex h-screen': isOpen
      })}
    >
      <div
        aria-modal={true}
        className={clsx(
          'w-10/12 md:w-11/12 dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg px-8 py-10 lg:px-24 lg:py-14 lg:max-w-screen-lg',
          'w-10/12 md:w-11/12 dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg lg:px-24 lg:py-14 lg:max-w-screen-lg',
          {
            'hidden ': !isOpen,
            'm-auto': isOpen
          }
        )}
      >
        <H3>{t('Delete Race X', { name: race?.name })}</H3>
        <Paragraph>{t('Are you sure you want to delete race?')}</Paragraph>
        <Spacer size="2xs" />

        <ButtonGroup>
          <Button type="button" onClick={onDismiss}>
            {t('Ignore')}
          </Button>
          <Button
            variant="danger"
            size="medium"
            type="button"
            onClick={handleSubmit}
          >
            {t('Delete')}
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );
}
