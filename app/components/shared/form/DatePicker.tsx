import * as React from 'react';
import { useContext } from 'react';

import type { CalendarDateTemplateEvent } from 'primereact/calendar';
import { Calendar } from 'primereact/calendar';

import type { FormEvent, Nullable } from 'primereact/ts-helpers';

import Label from '~/components/shared/form/Label';
import { FormContext } from '~/components/shared/form/UploadForm';

type DatePickerOptions = {
  name: string;
  label?: string;
  date: Nullable<Date>;
  minDate?: Date;
  viewDate?: Nullable<Date>
} & React.ComponentProps<'input'>;

export default function BasicDatePicker({
  name,
  label,
  date = null,
  minDate,
  viewDate
}: DatePickerOptions) {
  const [value, setValue] = React.useState<Date | null>(date);
  const formProps = useContext(FormContext);

  if (formProps.readOnly) {
    return (
      <div className="font-medium dark:text-white">
        {date ? date.toISOString().split('T')[0] : ''}
      </div>
    );
  }

  function handleOnChange(event: FormEvent<(Date | null)>) {
    formProps.setDirty && formProps.setDirty();
    setValue(event.value as Date);
  }

  return (
    <>
      <Label htmlFor="date-picker">{label}</Label>
      <Calendar
        className="date-picker input-text"
        dateFormat="yy-mm-dd"
        mask="9999-99-99"
        name={name}
        minDate={minDate}
        value={value}
        onChange={handleOnChange}
        dateTemplate={dateTemplateWithCypressTags}
        viewDate={viewDate}
      />
    </>
  );
}

function dateTemplateWithCypressTags(date: CalendarDateTemplateEvent) {
  return (
    <span
      data-cy-year={date.year}
      data-cy-month={Number(date.month) + 1}
      data-cy-day={date.day}
      data-cy-today={date.today}
    >
      {date.day}
    </span>
  );
}
