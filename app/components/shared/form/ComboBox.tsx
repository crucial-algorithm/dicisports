import { Combobox, Listbox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { TFunction } from 'i18next';
import * as React from 'react';
import { Fragment, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getI18nText } from '~/components/I18nText';
import { FormContext } from '~/components/shared/form/UploadForm';

import type { Language, TranslationObject } from '~/types';
import { getLocalizedText } from '~/utils/misc';

import { useTheme } from '~/utils/theme-provider';

export type Option = {
  value: string | number;
  label: string | TranslationObject;
  disabled?: boolean;
  image?: string;
};

type SelectProps = {
  name: string;
  options: Array<Option>;
  lang?: Language;
  defaultValue?: string | number | null;
  placeholder: string;
  clearOption?: boolean;
  clearLabel?: string;
  onChange?: (value: string | number) => void;
} & Omit<React.ComponentProps<'select'>, 'onChange' | 'defaultValue'>;

export default function ComboBox({
  name,
  className,
  options: paramOptions,
  defaultValue,
  lang,
  onChange,
  placeholder,
  clearOption,
  clearLabel
}: SelectProps) {
  const [t] = useTranslation('common');
  const options = paramOptions.map((o) => {
    return {
      disabled: o.disabled,
      value: o.value,
      label:
        typeof o.label === 'string'
          ? o.label
          : getLocalizedText(lang as Language, o.label)
    };
  });

  defaultValue = defaultValue === undefined ? null : defaultValue;

  const [selected, setSelected] = useState(defaultValue);
  const formProps = useContext(FormContext);

  if (formProps.readOnly) {
    return (
      <div className="font-medium dark:text-white">
        {options.find((o) => o.value === defaultValue)?.label}
      </div>
    );
  }

  function StyleOption({ active, disabled }: { active: boolean, disabled: boolean}) {
    console.log(disabled);
    return clsx('relative cursor-default select-none py-2 pl-10 pr-4', {
      'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100': active,
      'bg-white text-base dark:bg-gray-800 dark:text-gray-100': !active
    });
  }

  function onChangedInternal(value: string | number) {
    formProps.setDirty && formProps.setDirty();
    setSelected(value);
    onChange && onChange(value);
  }

  return (
    <Listbox value={selected} onChange={onChangedInternal}>
      <div className={clsx('ds-combo relative mt-1', className)}>
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
          {!selected && placeholder && (
            <span className="text-gray-400">{placeholder}</span>
          )}
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
            {clearOption && (
              <Listbox.Option
                key="empty"
                value={null}
                className={StyleOption}
                disabled={selected === null}
              >
                {clearLabel || t('Clear Combo')}
              </Listbox.Option>
            )}
            {options.map((option, idx) => (
              <Listbox.Option
                key={idx}
                className={StyleOption}
                value={option.value}
                disabled={option.disabled === true}
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
      <input type="hidden" name={name} value={selected || ''} />
    </Listbox>
  );
}

export function Creatable({
  name,
  options: paramsOptions = [],
  t,
  defaultValue,
  emptyLabel,
  defaultOption,
  lang
}: {
  name: string;
  options: Option[];
  t: TFunction;
  defaultValue: string | null;
  emptyLabel: string;
  defaultOption?: { value: string | number; label: string };
  lang?: Language;
}) {
  const { i18n } = useTranslation();
  const [theme] = useTheme();
  const inDarkMode = theme === 'dark';
  const formProps = useContext(FormContext);
  const options = paramsOptions.map((o) => {
    return {
      value: o.value,
      label:
        typeof o.label === 'string'
          ? o.label
          : getLocalizedText(lang as Language, o.label),
      image: o.image || ''
    };
  });

  const [query, setQuery] = useState('');
  const [values, setValues] =
    useState<{ value: string | number; label: string }[]>(options);
  const [activeOption, setActiveOption] = useState<{
    value: string | number;
    label: string;
  } | null>(
    values.find((v) => v.value === defaultValue || v.label === defaultValue) ||
      null
  );

  if (formProps.readOnly) {
    return (
      <div className="font-medium dark:text-white">
        {values.find((t) => t.value === defaultValue)?.label}
      </div>
    );
  }

  const filteredValues =
    query === ''
      ? values
      : values.filter((t) =>
          t.label.toLowerCase().includes(query.toLowerCase())
        );

  function handleOnSelectOption(value: string) {
    const v = values.find((e) => e.value === value || e.label === value);

    if (!v) {
      setValues((current) => [...current, { value, label: value }]);

      setActiveOption({ value, label: value });
      setQuery('');
    } else {
      setActiveOption(v);
      setQuery('');
    }
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
  }

  function handleOptionStyle({ active }: { active: boolean }) {
    return clsx('relative cursor-default select-none py-2 pl-10 pr-4', {
      'bg-gray-300 text-gray-700': active && !inDarkMode,
      'bg-gray-600 text-gray-100': active && inDarkMode
    });
  }

  function handleRemoveSelectedOption() {
    setActiveOption(null);
  }

  function display(o: Option | number | string | undefined | null): string {
    if (o == null || o === '') {
      return emptyLabel || '';
    }

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

  return (
    <div className="flex flex-row items-center gap-x-2">
      <Combobox
        value={activeOption ? activeOption.value : null}
        onChange={handleOnSelectOption}
        as="div"
        className="w-full md:w-80"
        name={`creatable-${name}`}
      >
        <div className="relative">
          <div className="z-100">
            <div>
              <Combobox.Input
                id={`creatable-${name}`}
                key={activeOption?.value}
                className="input-text"
                onChange={handleSearch}
                autoComplete="off"
                displayValue={display}
              />
            </div>

            <Combobox.Button
              className="absolute inset-y-0 right-0 flex items-center pr-2"
              name="creatable-button"
            >
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
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
          >
            {defaultOption && query === '' && (
              <Combobox.Option
                value={defaultOption.value}
                className={handleOptionStyle}
              >
                {defaultOption.label}
              </Combobox.Option>
            )}
            {filteredValues.length === 0 && query !== '' && (
              <Combobox.Option
                value={query}
                className={clsx(
                  'relative cursor-default select-none py-2 px-4',
                  {
                    'text-gray-700': !inDarkMode,
                    'text-gray-100': inDarkMode
                  }
                )}
              >
                {t('Create: X', { value: query })}
              </Combobox.Option>
            )}
            {filteredValues.map((v) => {
              return (
                <Combobox.Option
                  key={v.value}
                  value={v.value}
                  className={handleOptionStyle}
                >
                  {v.label}
                </Combobox.Option>
              );
            })}
          </Combobox.Options>
        </div>
      </Combobox>
      {activeOption && activeOption.value && (
        <button
          name="remove-schedule"
          type="button"
          onClick={handleRemoveSelectedOption}
          className="dark:text-blueGray-500 focus:ring-indigo-500"
        >
          <XMarkIcon className="h-4 w-4 m-0 inline-block" />
        </button>
      )}
    </div>
  );
}
