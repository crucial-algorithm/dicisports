import * as React from 'react';
import { useId } from '@reach/auto-id';

import Select from 'react-select';

import { useEffect, useState } from 'react';

import { inputBaseClasses } from '~/components/shared/form/InputBase';
import type { Language, TranslationObject } from '~/types';
import { getLocalizedText } from '~/utils/misc';

import { useTheme } from '~/utils/theme-provider';

export type Option = {
  value: string | number
  label: string | TranslationObject
  extra?: object
}

type Props = {
  options: Array<Option>
  lang?: Language
  defaultValue?: string | number
  placeholder: string
} & React.ComponentProps<'select'>

export default function ComboBox({
  name,
  defaultValue,
  className,
  options,
  lang,
  placeholder
}: Props) {
  const [value, setValue] = useState<Option | undefined>(undefined);
  const [theme] = useTheme();
  const inDarkMode = theme === 'dark';

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
    if (!defaultValue) {return;}
    setValue(pickOption(defaultValue));
  }, [defaultValue]);

  function handleSelectChange(o: Option) {
    setValue(o);
  }

  function NoOptionsMessage() {
    return <div style={{ textAlign: 'start' }}>&nbsp;</div>;
  }

  return (
    <>
      <input type="hidden" name={name} value={value?.value || ''} />
      <Select
        aria-label=""
        className={inputBaseClasses(className)}
        value={value}
        isClearable={false}
        isSearchable={true}
        backspaceRemovesValue={true}
        noOptionsMessage={NoOptionsMessage}
        placeholder={placeholder}
        components={{
          DropdownIndicator: () => null,
          IndicatorSeparator: () => null
        }}
        // @ts-ignore
        options={values}
        // @ts-ignore
        onChange={handleSelectChange}
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
              left: 0,
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
                !isFocused
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
