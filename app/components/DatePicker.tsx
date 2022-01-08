import * as React from 'react'
import pt from 'date-fns/locale/pt'
import Label from '~/components/underground/Label'
import InputBase from '~/components/underground/InputBase'
import HTMLId from '~/utils/HTMLId'

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
  const [value, setValue] = React.useState<Date | string | null>(
    date ? date.toISOString().split('T')[0] : null
  )
  const id = HTMLId()
  return (
    <>
      <Label id={id}>{label}</Label>
      <InputBase
        id={id}
        name={name}
        type="date"
        placeholder={label}
        defaultValue={value}
        onChange={(e) => setValue(new Date(e.target.value))}
      />
    </>
  )
}
