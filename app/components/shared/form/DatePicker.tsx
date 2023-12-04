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
  maxDate?: Date;
  viewDate?: Nullable<Date>;
  onChange?: (v: Date | null) => void;
  disabled?: boolean;
} & Omit<React.ComponentProps<'input'>, 'onChange'>;

export default function BasicDatePicker({
  name,
  label,
  date = null,
  minDate,
  maxDate,
  viewDate,
  disabled,
  onChange
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
    onChange && onChange(event.value ? event.value as Date : null);
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
        maxDate={maxDate}
        value={value}
        onChange={handleOnChange}
        dateTemplate={dateTemplateWithCypressTags}
        viewDate={viewDate}
        disabled={disabled}
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
