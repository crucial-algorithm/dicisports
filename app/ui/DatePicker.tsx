import * as React from 'react'
import TextField from '@mui/material/TextField'
import AdapterDateFns from '@mui/lab/AdapterDateFns'
import LocalizationProvider from '@mui/lab/LocalizationProvider'
import DatePicker from '@mui/lab/DatePicker'

type DatePickerOptions = {
  name: string
  label: string
}

export default function BasicDatePicker({ name, label }: DatePickerOptions) {
  const [value, setValue] = React.useState<Date | null>(null)

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
