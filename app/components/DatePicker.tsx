import * as React from 'react'
import TextField from '@mui/material/TextField'
import AdapterDateFns from '@mui/lab/AdapterDateFns'
import LocalizationProvider from '@mui/lab/LocalizationProvider'
import DatePicker from '@mui/lab/DatePicker'
import pt from 'date-fns/locale/pt'

type DatePickerOptions = {
  name: string
  label: string
  date: Date | null | undefined
}

export default function BasicDatePicker({
  name,
  label,
  date = null
}: DatePickerOptions) {
  const [value, setValue] = React.useState<Date | null>(date)

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} locale={pt}>
      <DatePicker
        label={label}
        value={value}
        onChange={(newValue) => {
          setValue(newValue)
        }}
        renderInput={(params) => (
          <TextField {...params} variant="standard" name={name} />
        )}
      />
    </LocalizationProvider>
  )
}
