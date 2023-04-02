import * as React from 'react';

import type { CalendarChangeEvent, CalendarDateTemplateEvent } from 'primereact/calendar';
import { Calendar } from 'primereact/calendar';

import Label from '~/components/shared/form/Label';

type DatePickerOptions = {
  name: string;
  label: string;
  date: Date | null | undefined;
  minDate?: Date;
  input?:  React.RefObject<any>;
} & React.ComponentProps<'input'>;

export default function BasicDatePicker({
  name,
  label,
  date = null,
  minDate,
  input
}: DatePickerOptions) {
  const [value, setValue] = React.useState<Date | null>(date);

  function handleOnChange(event: CalendarChangeEvent) {
    setValue(event.value as Date);
  }

  return (
    <>
      <Label htmlFor="date-picker">{label}</Label>
      <Calendar
        className="date-picker input-text"
        ref={input}
        dateFormat="yy-mm-dd"
        name={name}
        minDate={minDate}
        value={value}
        onChange={handleOnChange}
        dateTemplate={dateTemplateWithCypressTags}
      />
    </>
  );
}

function dateTemplateWithCypressTags(date: CalendarDateTemplateEvent) {
  return (
    <span
      data-cy-year={date.year}
      data-cy-month={Number(date.month)+1}
      data-cy-day={date.day}
      data-cy-today={date.today}
    >
      {date.day}
    </span>
  );
}
