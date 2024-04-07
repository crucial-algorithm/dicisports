import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { useRootData } from '~/hooks';
import Dialog from '~/components/shared/Dialog';
import I18nText, { getI18nText } from '~/components/I18nText';
import type { Sport, Language } from '~/types';


type SportsPickerProps = {
  title: string;
  sport: Sport | null;
  isOpen: boolean;
  triggerClose: () => void;
  onSportPicked: (sport: Sport | null) => void;
};

export default function SportsPickerDialog({
  title,
  sport,
  isOpen,
  triggerClose,
  onSportPicked
}: SportsPickerProps) {
  const { t, i18n } = useTranslation('common');
  const { sports } = useRootData();

  function handleReset() {
    onSportPicked(null);
    triggerClose();
  }

  function handleSelect(e: MouseEvent<HTMLDivElement>) {
    onSportPicked(
      sports.find((s) => s.id === Number(e.currentTarget.id)) || null
    );
    triggerClose();
  }

  function handleClose() {
    // do nothing - only used in mobile, where close is either from click the close button, clearing the location
    // or picking a location, all of which are handled by triggering the close function of the caller
  }

  return (
    <Dialog
      isOpen={isOpen}
      aria-label={title}
      onClose={handleClose}
      nextGen={true}
      title={title}
      triggerClose={triggerClose}
    >
      <div className="h-screen">
        {sport && (
          <p
            onClick={handleReset}
            className="w-full text-orange-600 dark:text-blueGray-500 font-medium text-center underline bold"
          >
            {t('Clean <something>', {
              something: getI18nText(sport.name, i18n.language as Language)
            })}
          </p>
        )}
        {sports.map(({ id, name }) => (
          <div
            id={String(id)}
            key={id}
            className="min-h-14 flex items-center px-2 border-b-2 border-gray-300"
            onClick={handleSelect}
          >
            <I18nText text={name} />
          </div>
        ))}
      </div>
    </Dialog>
  );
}
