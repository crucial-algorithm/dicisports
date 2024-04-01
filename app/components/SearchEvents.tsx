import { useNavigate, useSearchParams } from '@remix-run/react';
import { useDebounceFn } from 'ahooks';
import { buildImageUrl } from 'cloudinary-build-url';
import clsx from 'clsx';
import * as React from 'react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Combobox, Transition } from '@headlessui/react';

import type { SearchEventResults } from '~/server/db/events.server';

import type { Language } from '~/types';

import { useTheme } from '~/utils/theme-provider';


export default function SearchLocations({
  className,
  placeholder
}: {} & Exclude<React.ComponentProps<'select'>, 'onSelect'>) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('home');
  const noEventsLabel = t('No Events');
  const keepTypingLabel = t('Keep Typing');
  const [context, setContext] = useState<{
    search: string;
    results: Array<EventAutoCompleteOption>;
  } | null>(null);
  const [params] = useSearchParams();
  const search = params.get('search');

  const NoOptionsMessage = useCallback(() => {
    return (
      <div className="text-start">
        {context?.search && context?.search.length > 2
          ? noEventsLabel
          : keepTypingLabel}
      </div>
    );
  }, [context?.search, noEventsLabel, keepTypingLabel]);

  const handleOnComplete = useCallback(async (search: string) => {
    // Fetch events
    const res = await fetch(`/action/get-event-results?s=${search}`);
    const events = await res.json();

    const mapped: EventAutoCompleteOption[] = [];

    if (events && events.length) {
      events.map((e: SearchEventResults) =>
        mapped.push({
          value: e.slug as string,
          label: e.name as string,
          image: e.image1 || e.image2 || e.image3 || e.image4 || e.image5 || ''
        })
      );
    }

    setContext({ search, results: mapped });
  }, []);

  const handleOnChange = useCallback(
    (v: string | number) => {
      const option = context?.results.find((o) => o.value === v);

      option && navigate(`${i18n.language}/event/${option.value}`);
    },
    [navigate, context?.results, i18n.language]
  );

  useEffect(() => {
    !search && setContext(null);
  }, [search]);

  return (
    <EventsAutoComplete
      id="search-box"
      options={context?.results}
      placeholder={search || placeholder || ''}
      completeMethod={handleOnComplete}
      onChange={handleOnChange}
      noOptionsMessage={NoOptionsMessage}
      className={className}
    />
  );
}

type EventAutoCompleteOption = {
  value: string;
  label: string;
  image?: string;
}

type EventsAutoCompleteProps = {
  id: string;
  options?: Array<EventAutoCompleteOption>;
  lang?: Language;
  placeholder: string;
  onChange?: (value: string) => void;
  completeMethod: (value: string) => Promise<void>;
  noOptionsMessage: () => React.ReactElement;
} & Omit<React.ComponentProps<'select'>, 'onChange'>;

function EventsAutoComplete({
  id,
  className,
  options = [],
  lang,
  placeholder,
  onChange,
  completeMethod,
  noOptionsMessage: NoOptionsMessage
}: EventsAutoCompleteProps) {
  const dropdownButton = useRef<HTMLButtonElement | null>(null);
  const [theme] = useTheme();
  const inDarkMode = theme === 'dark';
  const { run: handleInputChange } = useDebounceFn(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      event.target.value && completeMethod(event.target.value);
    },
    { wait: 500 }
  );

  function handleSelectChange(value: string) {
    console.log('changed...', value);
    onChange && onChange(value);
  }

  function handleOptionStyle(option: EventAutoCompleteOption) {
    return ({ active }: { active: boolean }) =>
      clsx('relative cursor-default select-none pl-10 pr-4 mb-1 h-20', {
        'bg-gray-300 text-gray-700': active && !inDarkMode,
        'bg-gray-600 text-gray-100': active && inDarkMode
      });
  }

  function display(value: string): string {
    return options.find((v) => v.value === value)?.label || '';
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
              className="input-text px-4 lg:px-11 rounded-full"
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
              {options.length === 0 ? (
                <div className="relative cursor-default select-none py-2 px-4 text-blueGray-500 text-center">
                  <NoOptionsMessage />
                </div>
              ) : (
                options.map(({ value, label, image }, index) => (
                  <Combobox.Option
                    key={`${index}-${value}`}
                    className={handleOptionStyle({ value, label, image })}
                    value={value}
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
