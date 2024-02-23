import { Combobox, Transition } from '@headlessui/react';
import { useDebounceFn } from 'ahooks';
import { buildImageUrl } from 'cloudinary-build-url';
import clsx from 'clsx';
import type { ReactElement } from 'react';
import * as React from 'react';
import { Fragment, useRef } from 'react';

import type { DiciLocation, Language, TranslationObject } from '~/types';
import { getLocalizedText } from '~/utils/misc';
import { useTheme } from '~/utils/theme-provider';

export type SearchResultType = 'Event' | 'Group' | 'Location' | 'Header';

export type SearchResult = {
  value: string;
  label: string | TranslationObject;
  image?: string;
  type: SearchResultType;
  extra?: DiciLocation;
  disabled?: boolean;
};

type Props = {
  id: string;
  options?: Array<SearchResult>;
  lang?: Language;
  placeholder: string;
  onChange?: (value: string | number) => void;
  completeMethod: (value: string) => Promise<void>;
  noOptionsMessage: () => ReactElement;
  locationsGroupLabel?: string;
} & Omit<React.ComponentProps<'select'>, 'onChange'>;

type CuratedSearchResult = Omit<SearchResult, 'label'> & { label: string };

export function SearchAutoComplete({
  id,
  className,
  options = [],
  lang,
  placeholder,
  onChange,
  completeMethod,
  noOptionsMessage: NoOptionsMessage,
  locationsGroupLabel
}: Props) {
  const dropdownButton = useRef<HTMLButtonElement | null>(null);
  const [theme] = useTheme();
  const inDarkMode = theme === 'dark';
  const { run: handleInputChange } = useDebounceFn(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      event.target.value && completeMethod(event.target.value);
    },
    { wait: 500 }
  );

  const values: Array<CuratedSearchResult> = options.map((o) => {
    return {
      ...o,
      label:
        typeof o.label === 'string'
          ? o.label
          : getLocalizedText(lang as Language, o.label)
    };
  });

  // creating "group" like options for location
  const idx = values.findIndex((v) => v.type === 'Location');

  if (idx > 0) {
    values.splice(idx, 0, {
      label: locationsGroupLabel || '',
      value: '',
      type: 'Header',
      disabled: true
    });
  }

  function handleSelectChange(value: string) {
    onChange && onChange(value as string);
  }

  function handleOptionStyle(option: SearchResult) {
    return ({ active }: { active: boolean }) =>
      clsx('relative cursor-default select-none pl-10 pr-4', {
        'bg-gray-300 text-gray-700': active && !inDarkMode,
        'bg-gray-600 text-gray-100': active && inDarkMode,
        'mb-1 h-20': option.type === 'Event',
        'search-result-group': option.type === 'Group',
        'py-2': option.type === 'Location',
        'text-sm italic py-1 bg-gray-100 border-b-2 border-gray-200 text-gray-500 dark:bg-gray-500 dark:border-gray-600 dark:text-blueGray-400':
          option.type === 'Header'
      });
  }

  function display(value: string): string {
    return values.find((v) => v.value === value)?.label || '';
  }

  // trigger open of dropdown when user focus input
  function handleOpenOnFocus(e: FocusEvent) {
    // Discard if user clicks in dropdown button
    // Without this, dropdown would open and close immediately
    if (e.relatedTarget) {
      return;
    }
    dropdownButton.current?.click();
  }

  return (
    <div className={clsx('top-16', className)}>
      <Combobox onChange={handleSelectChange}>
        <div className="relative mt-1">
          <div className="z-100">
            <Combobox.Input
              id={id}
              className="input-text px-4 lg:px-11"
              displayValue={display}
              placeholder={placeholder}
              onChange={handleInputChange}
              // @ts-ignore
              onFocus={handleOpenOnFocus}
            />
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Combobox.Options
              className={clsx(
                'absolute w-full overflow-auto z-10 mt-1 max-h-60 py-1',
                'rounded-md shadow-lg',
                'ring-1 ring-black ring-opacity-5',
                'focus:outline-none sm:text-sm',
                'bg-white text-base',
                'dark:bg-gray-700 dark:text-gray-300'
              )}
              static
            >
              {values.length === 0 ? (
                <div className="relative cursor-default select-none py-2 px-4 text-blueGray-500 text-center">
                  <NoOptionsMessage />
                </div>
              ) : (
                values.map(({ value, label, image, type, disabled }, index) => (
                  <Combobox.Option
                    key={`${index}-${value}`}
                    className={handleOptionStyle({ value, label, image, type })}
                    value={value}
                    disabled={disabled}
                  >
                    {({ selected, active }) => (
                      <div className="flex items-center">
                        {image && (
                          <img
                            src={buildImageUrl(image, {
                              transformations: {
                                resize: {
                                  type: 'fill',
                                  width: 80,
                                  height: 80
                                }
                              }
                            })}
                            className="h-20 w-20 mr-2 flex-shrink-0"
                            alt="logo"
                          />
                        )}
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}
