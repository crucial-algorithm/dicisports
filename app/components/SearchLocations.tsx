import { useTranslation } from 'react-i18next';

import * as React from 'react';

import Select from 'react-select/async';

import { useState } from 'react';

import { useSearchParams } from '@remix-run/react';

import { AutoComplete } from '~/components/shared/form/ComboBox';

import { inputBaseClasses } from '~/components/shared/form/InputBase';
import type { DiciLocation } from '~/types';


import { useTheme } from '~/utils/theme-provider';
import MapUtils from '~/utils/MapUtils';


type SearchLocationsProps = {
  placeholder?: string
  ariaLabel?: string
  onSelect: (option: DiciLocation) => void
  defaultValue?: string
  mapToken: string
} & Exclude<React.ComponentProps<'select'>, 'onSelect'>

export default function SearchLocations({
  ariaLabel,
  className,
  placeholder,
  defaultValue,
  onSelect,
  mapToken
}: SearchLocationsProps) {
  const { t } = useTranslation('home');
  const [theme] = useTheme();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const inDarkMode = theme === 'dark';
  const mapUtils = new MapUtils(mapToken);
  const [params] = useSearchParams();
  const search = params.get('search');
  const [context, setContext] = useState<{
    search: string;
    results: { value: string; label: string; extra: DiciLocation }[];
  } | null>(null);

  async function handlerLoadLocations(searchTerm: string) {
    const results = await mapUtils.searchCityInMapBox(searchTerm);

    setSearchTerm(searchTerm);
    if (results === null) {
      return [];
    }
    return results.map((l: DiciLocation) => ({
      value: `${l.coords}|${l.address}`,
      label: l.address || `${l.coords}|${l.address}`,
      extra: l
    }));
  }

  function handlerLocationChanged(v: {
    value: number;
    label: string;
    extra: DiciLocation;
  }) {
    const { extra } = v;

    if (!extra) {
      return;
    }
    onSelect(extra);
    setSearchTerm('');
  }

  function NoOptionsMessage() {
    return (
      <div className="text-start">
        {searchTerm.length > 2 ? t('No Cities') : t('Keep Typing')}
      </div>
    );
  }

  async function handleOnComplete(needle: string) {
    const results = await handlerLoadLocations(needle);

    setContext({ search: needle, results });
  }

  if (Math.random() < 1) {
    return (
      <AutoComplete
        options={context?.results.map(({ label, value }) => ({ value, label }))}
        placeholder={placeholder || ''}
        completeMethod={handleOnComplete}
        onChange={handleOnChange}
      />
    );
  }

  function handleOnChange(v: string | number) {
    const option = context?.results.find((o) => o.value === v);

    if (option) {
      onSelect(option.extra);
    }
  }

  return (
    <>
      <Select
        /* force re-render to prevent value to stay the same
         * when navigating home after performing a search
         */
        key={`my-select-${search}`}
        aria-label={ariaLabel}
        className={inputBaseClasses(className)}
        classNamePrefix="react-select"
        defaultValue={defaultValue}
        isClearable={false}
        isSearchable={true}
        backspaceRemovesValue={true}
        noOptionsMessage={NoOptionsMessage}
        placeholder={search || placeholder}
        components={{
          DropdownIndicator: () => null,
          IndicatorSeparator: () => null
        }}
        // @ts-ignore
        loadOptions={handlerLoadLocations}
        // @ts-ignore
        onChange={handlerLocationChanged}
        styles={{
          control: (base) => {
            return {
              ...base,
              backgroundColor: undefined,
              border: 0,
              boxShadow: 'none'
            };
          },
          input: (base) => {
            return {
              ...base,
              color: 'var(--color-blueGray-500)',
              outline: 'none'
            };
          },
          menu: (base) => {
            return {
              ...base,
              borderRadius: 0,
              borderTopLeftRadius: 4,
              backgroundColor: inDarkMode
                ? 'var(--color-gray-800)'
                : 'var(--color-gray-100)'
            };
          },
          option: (base, { isFocused }) => {
            return {
              ...base,
              color: inDarkMode
                ? 'var(--color-blueGray-500)'
                : 'var(--color-gray-500)',
              backgroundColor:
                isFocused === false
                  ? undefined
                  : inDarkMode
                  ? 'var(--color-gray-600)'
                  : 'var(--color-gray-200)'
            };
          },
          singleValue: (base) => {
            return {
              ...base,
              color: inDarkMode
                ? 'var(--color-blueGray-500)'
                : 'var(--color-gray-500)'
            };
          },
          clearIndicator: (base) => {
            return {
              ...base,
              cursor: 'pointer',
              ':hover': {
                color: inDarkMode ? 'var(--color-gray-200)' : 'initial'
              }
            };
          }
        }}
      />
    </>
  );
}
