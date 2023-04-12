import type { ReactElement } from 'react';
import * as React from 'react';
import { Fragment, useContext, useRef, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useDebounceFn } from 'ahooks';
import { buildImageUrl } from 'cloudinary-build-url';

import { Combobox, Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';

import type { Language, TranslationObject } from '~/types';
import { getLocalizedText } from '~/utils/misc';

import { useTheme } from '~/utils/theme-provider';
import { getI18nText } from '~/components/I18nText';
import { UploadFormContext } from '~/components/shared/form/UploadForm';

export type Option = {
  value: string | number;
  label: string | TranslationObject;
  image?: string;
};

type Props = {
  id: string;
  options?: Array<Option>;
  lang?: Language;
  placeholder: string;
  onChange?: (value: string | number) => void;
  completeMethod: (value: string) => Promise<void>;
  noOptionsMessage: () => ReactElement;
} & Omit<React.ComponentProps<'select'>, 'onChange'>;

export function AutoComplete({
  id,
  className,
  options = [],
  lang,
  placeholder,
  onChange,
  completeMethod,
  noOptionsMessage: NoOptionsMessage
}: Props) {
  const { i18n } = useTranslation();
  const dropdownButton = useRef<HTMLButtonElement | null>(null);
  const [theme] = useTheme();
  const inDarkMode = theme === 'dark';
  const { run: handleInputChange } = useDebounceFn(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      event.target.value && completeMethod(event.target.value);
    },
    { wait: 500 }
  );

  const values = options.map((o) => {
    return {
      value: o.value,
      label:
        typeof o.label === 'string'
          ? o.label
          : getLocalizedText(lang as Language, o.label),
      image: o.image || ''
    };
  });

  function handleSelectChange(value: string) {
    onChange && onChange(value as string);
  }

  function handleOptionStyle({ active }: { active: boolean }) {
    return clsx('relative cursor-default select-none py-2 pl-10 pr-4', {
      'bg-gray-300 text-gray-700': active && !inDarkMode,
      'bg-gray-600 text-gray-100': active && inDarkMode
    });
  }

  function display(o: Option | number | string | undefined): string {
    if (['number', 'string'].includes(typeof o)) {
      const c = values.find((v) => v.value === o);

      return c?.label || '';
    }

    const option = o as Option;

    if (typeof option.label === 'string') {
      return option.label;
    }

    return getI18nText(option.label, i18n.language as Language);
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
              className="input-text"
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
                {
                  'bg-gray-800 text-gray-100': inDarkMode,
                  'bg-white text-base': !inDarkMode
                }
              )}
              static
            >
              {values.length === 0 ? (
                <div className="relative cursor-default select-none py-2 px-4 text-blueGray-500 text-center">
                  <NoOptionsMessage />
                </div>
              ) : (
                values.map(({ value, label, image }, index) => (
                  <Combobox.Option
                    key={`${index}-${value}`}
                    className={handleOptionStyle}
                    value={value}
                  >
                    {({ selected, active }) => (
                      <div className="flex items-center">
                        {image.length > 0 && (
                          <img
                            src={buildImageUrl(image, {})}
                            className="h-10 flex-shrink-0 absolute"
                            alt=""
                          />
                        )}
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          } ${image.length > 0 ? 'ml-12' : ''}`}
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

type SelectProps = {
  name: string;
  options: Array<Option>;
  lang?: Language;
  defaultValue?: string | number;
  placeholder: string;
  onChange?: (value: string | number) => void;
} & Omit<React.ComponentProps<'select'>, 'onChange' | 'defaultValue'>;

export default function ComboBox({
  name,
  className,
  options: paramOptions,
  defaultValue,
  lang,
  onChange
}: SelectProps) {
  const options = paramOptions.map((o) => {
    return {
      value: o.value,
      label:
        typeof o.label === 'string'
          ? o.label
          : getLocalizedText(lang as Language, o.label)
    };
  });

  const [selected, setSelected] = useState(defaultValue);
  const formProps = useContext(UploadFormContext);

  if (formProps.readOnly) {
    return (
      <div className="font-medium">
        {options.find((o) => o.value === defaultValue)?.label}
      </div>
    );
  }

  function StyleOption({ active }: { active: boolean }) {
    return clsx('relative cursor-default select-none py-2 pl-10 pr-4', {
      'bg-gray-100 text-gray-800': active,
      'bg-white text-base dark:bg-gray-800 dark:text-gray-100': !active
    });
  }

  function onChangedInternal(value: string | number) {
    setSelected(value);
    onChange && onChange(value);
  }

  return (
    <Listbox value={selected} onChange={onChangedInternal}>
      <div className={clsx('relative mt-1', className)}>
        <Listbox.Button
          className="input-text text-left min-h-[60px]"
          name={`select-${name}`}
        >
          <span className="block truncate">
            {options.find((o) => o.value === selected)?.label || ''}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className={clsx(
              'absolute w-full overflow-auto py-1 mt-2 max-h-60 z-150',
              'rounded-md shadow-lg ring-1 ring-black ring-opacity-5',
              'text-base sm:text-sm',
              'bg-white text-base dark:bg-gray-800 dark:text-gray-100',
              'focus:outline-none'
            )}
          >
            {options.map((option, idx) => (
              <Listbox.Option
                key={idx}
                className={StyleOption}
                value={option.value}
              >
                {({ selected, active }) => (
                  <>
                    <span
                      className={clsx('block truncate', {
                        'font-medium': selected,
                        'font-normal': !selected
                      })}
                    >
                      {option.label}
                    </span>
                    {selected && (
                      <span
                        className={clsx(
                          'absolute inset-y-0 left-0 flex items-center pl-3',
                          {
                            'text-grey-600 dark:text-gray-800': active,
                            'text-grey-600 dark:text-gray-100': !active
                          }
                        )}
                      >
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
      <input type="hidden" name={name} value={selected} />
    </Listbox>
  );
}
