import * as React from 'react';

import Label from '~/components/shared/form/Label';
import InputBase from '~/components/shared/form/InputBase';
import HTMLId from '~/utils/HTMLId';

type DatePickerOptions = {
  name: string;
  label: string;
  date: Date | null | undefined;
  onChange?: (value: string) => void | null;
  input?:  React.RefObject<HTMLInputElement>;
} & Omit<React.ComponentProps<'input'>, 'onChange'>;

export default function BasicDatePicker({
  name,
  label,
  date = null,
  onChange,
  input
}: DatePickerOptions) {
  const [value, setValue] = React.useState<string>(
    date ? date.toISOString().split('T')[0] : ''
  );
  const id = HTMLId();

  function handleOnChange(e: any) {
    const str: string = new Date(e.target.value).toISOString();

    setValue(str);
    onChange && onChange(str);
  }

  return (
    <>
      <Label htmlFor={id}>{label}</Label>
      <InputBase
        id={id}
        name={name}
        type="date"
        placeholder={label}
        defaultValue={value}
        input={input}
        onChange={handleOnChange}
      />
    </>
  );
}
