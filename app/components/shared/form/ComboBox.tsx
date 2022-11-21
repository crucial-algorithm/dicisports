import * as React from 'react';
import { Fragment, useEffect, useRef, useState } from 'react';

import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

import type { Language, TranslationObject } from '~/types';
import { getLocalizedText } from '~/utils/misc';

import { useTheme } from '~/utils/theme-provider';
import { inputBaseClasses } from '~/components/shared/form/InputBase';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

export type Option = {
  value: string | number;
  label: string | TranslationObject;
  extra?: object;
};

type Props = {
  options: Array<Option>;
  lang?: Language;
  defaultValue?: string | number;
  placeholder: string;
  onChange?: (value: string | number) => void;
} & Omit<React.ComponentProps<'select'>, 'onChange'>;

export default function ComboBox({
  name,
  defaultValue,
  className,
  options,
  lang,
  placeholder,
  onChange
}: Props) {
  const { i18n } = useTranslation();
  const [value, setValue] = useState<Option | undefined>(
    options.find((o) => o.value === defaultValue) || undefined
  );
  const dropdownButton = useRef<HTMLButtonElement | null>(null);
  const [query, setQuery] = useState('');
  const [theme] = useTheme();
  const inDarkMode = theme === 'dark';

  console.log(options);

  const values = options.map((o) => {
    return {
      value: o.value,
      label:
        typeof o.label === 'string'
          ? o.label
          : getLocalizedText(lang as Language, o.label)
    };
  });

  function pickOption(value: string | number): Option {
    return values.find((o) => o.value === value) as Option;
  }

  useEffect(() => {
    if (!defaultValue) {
      return;
    }
    setValue(pickOption(defaultValue));
  }, [defaultValue]);

  function handleSelectChange(o: Option) {
    setValue(o);
    if (onChange) {
      onChange(o.value);
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
  }

  function handleOptionStyle({ active }: { active: boolean }) {
    return `relative cursor-default select-none py-2 pl-10 pr-4 ${
      active ? 'bg-teal-600 text-white' : 'text-gray-900'
    }`;
  }

  function display(o: Option | number | string) {
    if (['number', 'string'].includes(typeof o)) {
      const c = values.find((v) => v.value === o);

      return c?.label;
    }
    return (o as Option).label;
  }

  const filteredValues =
    query === ''
      ? values
      : values.filter(({ label }) => {
          return label.toLowerCase().includes(query.toLowerCase());
        });

  function handleOpenOnFocus() {
    dropdownButton.current?.click();
  }

  return (
    <div className="top-16 w-72">
      <Combobox value={value} onChange={handleSelectChange} >
        <div className="relative mt-1">
          <div className="z-100">
            <Combobox.Input
              className={clsx(inputBaseClasses('py-2.5'), className)}
              displayValue={display}
              onChange={handleInputChange}
              onFocus={handleOpenOnFocus}
            />
            <Combobox.Button ref={dropdownButton} className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Combobox.Options className="z-10 absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm" static>
              {filteredValues.length === 0 ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  Nothing found.
                </div>
              ) : (
                filteredValues.map(({ value, label }, index) => (
                  <Combobox.Option
                    key={`${index}-${value}`}
                    className={handleOptionStyle}
                    value={value}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {label}
                        </span>
                        {selected ? (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                              active ? 'text-white' : 'text-teal-600'
                            }`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
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
