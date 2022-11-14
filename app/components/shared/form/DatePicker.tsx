import * as React from 'react';

import Label from '~/components/shared/form/Label';
import InputBase from '~/components/shared/form/InputBase';
import HTMLId from '~/utils/HTMLId';

type DatePickerOptions = {
  name: string;
  label: string;
  date: Date | null | undefined;
  input?:  React.RefObject<HTMLInputElement>;
} & React.ComponentProps<'input'>;

export default function BasicDatePicker({
  name,
  label,
  date = null,
  input
}: DatePickerOptions) {
  const [value, setValue] = React.useState<string>(
    date ? date.toISOString().split('T')[0] : ''
  );
  const id = HTMLId();

  function handleOnChange(date: any) {
    const str: string = new Date(date).toISOString();

    setValue(str);
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
