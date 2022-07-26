import * as React from 'react';

import Label from '~/components/shared/form/Label';
import InputBase from '~/components/shared/form/InputBase';
import HTMLId from '~/utils/HTMLId';

type DatePickerOptions = {
  name: string
  label: string
  date: Date | null | undefined
} & React.ComponentProps<'input'>

export default function BasicDatePicker({
  name,
  label,
  date = null
}: DatePickerOptions) {
  const [value, setValue] = React.useState<string>(
    date ? date.toISOString().split('T')[0] : ''
  );
  const id = HTMLId();

  return (
    <>
      <Label htmlFor={id}>{label}</Label>
      <InputBase
        id={id}
        name={name}
        type="date"
        placeholder={label}
        defaultValue={value}
        onChange={(e) => setValue(new Date(e.target.value).toISOString)}
      />
    </>
  );
}
