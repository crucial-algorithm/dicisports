import { useSearchParams } from '@remix-run/react';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AutoComplete } from '~/components/shared/form/ComboBox';
import type { DiciLocation } from '~/types';
import MapUtils from '~/utils/MapUtils';

type SearchLocationsProps = {
  placeholder?: string;
  onSelect: (option: DiciLocation) => void;
  defaultValue?: string;
  mapToken: string;
} & Exclude<React.ComponentProps<'select'>, 'onSelect'>;

export default function SearchLocations({
  className,
  placeholder,
  onSelect,
  mapToken
}: SearchLocationsProps) {
  const { t } = useTranslation('home');
  const noCitiesLabel = t('No Cities');
  const keepTypingLabel = t('Keep Typing');
  const [context, setContext] = useState<{
    search: string;
    results: { value: string; label: string; extra: DiciLocation }[];
  } | null>(null);
  const [params] = useSearchParams();
  const search = params.get('search');

  const NoOptionsMessage = useCallback(() => {
    return (
      <div className="text-start">
        {context?.search && context?.search.length > 2
          ? noCitiesLabel
          : keepTypingLabel}
      </div>
    );
  }, [context?.search, noCitiesLabel, keepTypingLabel]);

  const handleOnComplete = useCallback(async (search: string) => {
    const mapUtils = new MapUtils(mapToken);
    const results = await mapUtils.searchCityInMapBox(search);

    const mapped = (results || []).map((l: DiciLocation) => ({
      value: `${l.coords}|${l.address}`,
      label: l.address || `${l.coords}|${l.address}`,
      extra: l
    }));

    setContext({ search, results: mapped });
  }, [mapToken]);

  const handleOnChange = useCallback((v: string | number) => {
    const option = context?.results.find((o) => o.value === v);

    option && onSelect(option.extra);
  }, [context?.results, onSelect]);

  useEffect(() => {
    !search && setContext(null);
  }, [search]);

  return (
    <AutoComplete
      name="search-box"
      options={context?.results.map(({ label, value }) => ({ value, label }))}
      placeholder={placeholder || ''}
      completeMethod={handleOnComplete}
      onChange={handleOnChange}
      noOptionsMessage={NoOptionsMessage}
      className={className}
    />
  );

}
