import clsx from 'clsx';
import * as React from 'react';
import { useState } from 'react';

import type { DropdownChangeEvent, DropdownProps } from 'primereact/dropdown';
import { Dropdown } from 'primereact/dropdown';

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
        <div className="dark:text-white text-black text-lg font-medium">
          {option.name}
        </div>
        <div className="dark:text-blueGray-500 option-description">
          {option.description}
        </div>
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
      className={clsx('w-full md:w-14rem', className)}
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
