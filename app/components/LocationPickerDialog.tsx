import clsx from 'clsx';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import Dialog from '~/components/shared/Dialog';

type LocationPickerProps = {
  title: string;
  location: string | null;
  locations: { region: string; events: number }[];
  isOpen: boolean;
  triggerClose: () => void;
  onLocationPicked: (location: LocationInPicker | null) => void;
};


type LocationInPicker = {
  value: string;
  label: string;
};

// Once we have multiple countries, we will handle specific regions for each country
// with translations. For now, we only have Portugal, so lets make it static code
const regions = [
  { value: 'Aveiro', label: 'Aveiro' },
  { value: 'Beja', label: 'Beja' },
  { value: 'Braga', label: 'Braga' },
  { value: 'Bragança', label: 'Bragança' },
  { value: 'Castelo Branco', label: 'Castelo Branco' },
  { value: 'Coimbra', label: 'Coimbra' },
  { value: 'Évora', label: 'Évora' },
  { value: 'Faro', label: 'Faro' },
  { value: 'Guarda', label: 'Guarda' },
  { value: 'Leiria', label: 'Leiria' },
  { value: 'Lisbon', label: 'Lisboa' },
  { value: 'Portalegre', label: 'Portalegre' },
  { value: 'Porto', label: 'Porto' },
  { value: 'Santarém', label: 'Santarém' },
  { value: 'Setúbal', label: 'Setúbal' },
  { value: 'Viana do Castelo', label: 'Viana do Castelo' },
  { value: 'Vila Real', label: 'Vila Real' },
  { value: 'Viseu', label: 'Viseu' }
];


export default function LocationPickerDialog({
  title,
  location,
  locations,
  isOpen,
  triggerClose,
  onLocationPicked
}: LocationPickerProps) {
  const { t } = useTranslation('common');
  const stats: Record<string, number> = {};

  locations.map(({ region, events }) => (stats[region] = events));

  function handleReset() {
    onLocationPicked(null);
    triggerClose();
  }

  function handleSelect(e: MouseEvent<HTMLDivElement>) {
    if (!stats[e.currentTarget.id]) {
      return;
    }
    onLocationPicked({
      value: e.currentTarget.id,
      label: regions.find((r) => r.value === e.currentTarget.id)?.label || ''
    });
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
        {location && (
          <p
            onClick={handleReset}
            className="w-full text-orange-600 dark:text-blueGray-500 font-medium text-center underline bold"
          >
            {t('Clean <something>', { something: location })}
          </p>
        )}
        {regions.map(({ value, label }) => (
          <div
            id={value}
            key={value.replace(' ', '-')}
            className={clsx(
              'min-h-14 flex items-center px-2 border-b-2 border-gray-300',
              { 'opacity-50': !stats[value] }
            )}
            onClick={handleSelect}
          >
            {label}
          </div>
        ))}
      </div>
    </Dialog>
  );
}

function mapValueToLocationInPicker(location: string | null): LocationInPicker | null {
  if (!location) {
    return null;
  }
  const region = regions.find((r) => r.value === location);

  return region ? { value: region.value, label: region.label } : null;
}

export { mapValueToLocationInPicker, regions as PT_REGIONS };

export type { LocationInPicker };
