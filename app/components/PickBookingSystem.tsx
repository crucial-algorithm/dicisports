import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField
} from '@mui/material'
import { useState } from 'react'
import { TFunction } from 'i18next'

export type PickBookingSystemOptions = {
  name: string
  t: TFunction // ns: create-event-form
}

export default function PickBookingSystem({
  name,
  t
}: PickBookingSystemOptions) {
  const [disabled, setDisabled] = useState<boolean>(true)
  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">
        {t('How Is Booking Going To Be Managed')}
      </FormLabel>
      <RadioGroup
        aria-label={t('How Is Booking Going To Be Managed')}
        defaultValue="internal"
        name={name}
        onChange={(e) => {
          setDisabled(e.target.value === 'internal')
        }}
        sx={{ mb: 1 }}
      >
        <FormControlLabel
          value="internal"
          control={<Radio />}
          label={t('Manage Booking in Platform') as string}
        />
        <FormControlLabel
          value="external"
          control={<Radio />}
          label={t('Manage Booking Externally') as string}
        />
      </RadioGroup>
      <TextField
        label={t('Link to External Booking URL')}
        name={`${name}-url`}
        variant="standard"
        disabled={disabled}
        fullWidth={true}
      />
    </FormControl>
  )
}
