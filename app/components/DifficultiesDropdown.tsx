import clsx from 'clsx';
import * as React from 'react';

import type { DropdownChangeEvent, DropdownProps } from 'primereact/dropdown';


import { Dropdown } from 'primereact/dropdown';
import { useState } from 'react';

import { H3, H5 } from '~/components/shared/typography';

import type { Difficulty, Language } from '~/types';

import { getI18nText } from '~/components/I18nText';


export default function DifficultiesDropdown({
  difficulties,
  defaultValue,
  language,
  onChange,
  name,
  className
}: {
  name: string;
  defaultValue: number;
  difficulties: Array<Difficulty>;
  language: Language;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [value, setValue] = useState<number>(defaultValue);

  function optionTemplate(option: OurDifficultyLevelOption) {
    return (
      <>
        <H3>{option.name}</H3>
        <H5>{option.description}</H5>
      </>
    );
  }

  function handleOnChange(e: DropdownChangeEvent) {
    setValue(e.value);
    onChange && onChange(value);
  }

  return (
    <Dropdown
      name={name}
      value={value}
      optionLabel="name"
      options={difficulties.map((d) => {
        return {
          name: getI18nText(d.name, language),
          description: getI18nText(d.description, language),
          value: d.id
        };
      })}
      valueTemplate={selectedValueTemplate}
      itemTemplate={optionTemplate}
      onChange={handleOnChange}
      className={clsx('w-full md:w-14rem difficulty-dropdown', className)}
    />
  );
}

function selectedValueTemplate(
  option: OurDifficultyLevelOption,
  props: DropdownProps
) {
  if (option) {
    return <span>{option.name}</span>;
  }

  return <span>{props.placeholder}</span>;
}


type OurDifficultyLevelOption = {
  name: string;
  description: string;
  value: number;
}
