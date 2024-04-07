import { useNavigate, useSearchParams } from '@remix-run/react';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SearchResult } from '~/components/SearchAutoComplete';
import { SearchAutoComplete } from '~/components/SearchAutoComplete';
import type { DiciLocation } from '~/types';
import MapUtils from '~/utils/MapUtils';
import type { SearchEventResults } from '~/server/db/events.server';

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
  const navigate = useNavigate();

  const { t, i18n } = useTranslation('home');
  const noCitiesLabel = t('No Cities');
  const keepTypingLabel = t('Keep Typing');
  const [context, setContext] = useState<{
    search: string;
    results: Array<SearchResult>;
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

    // Fetch events
    const res = await fetch(`/action/get-event-results?s=${search}`);
    const events = await res.json();

    const mapped: Array<SearchResult> = [];

    if (events && events.length) {
      events.map((e: SearchEventResults) =>
        mapped.push({
          value: e.slug as string,
          label: e.name as string,
          image: e.image1 || e.image2 || e.image3 || e.image4 || e.image5 || '',
          type: 'Event'
        })
      );
    }

    (results || []).map((l: DiciLocation) =>
      mapped.push({
        value: `${l.coords}|${l.address}`,
        label: l.address || `${l.coords}|${l.address}`,
        extra: l,
        type: 'Location'
      })
    );

    setContext({ search, results: mapped });
  }, [mapToken]);

  const handleOnChange = useCallback((v: string | number) => {
    const option = context?.results.find((o) => o.value === v);

    // If option doesn't have extra, it means that it's an event and not a location
    if (option && !(option.extra)) {
      navigate(`/${i18n.language}/event/${option.value}`);
    }

    if (option && option.extra) {
      onSelect(option.extra);
    }
  }, [navigate, context?.results, onSelect, i18n.language]);

  useEffect(() => {
    !search && setContext(null);
  }, [search]);

  return (
    <SearchAutoComplete
      id="search-box"
      options={context?.results}
      placeholder={search || placeholder || ''}
      completeMethod={handleOnComplete}
      onChange={handleOnChange}
      noOptionsMessage={NoOptionsMessage}
      className={className}
      locationsGroupLabel={t('Locations Group In Search')}
    />
  );

}
