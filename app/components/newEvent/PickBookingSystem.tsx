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
  useExternal: boolean | undefined
  url: string | null | undefined
  t: TFunction // ns: create-event-form
}

const Values = {
  External: 'external',
  Internal: 'internal'
}

export default function PickBookingSystem({
  name,
  useExternal = false,
  url = '',
  t
}: PickBookingSystemOptions) {
  const [state, setState] = useState<{
    value: string
    disabled: boolean
  }>({
    value: useExternal ? Values.External : Values.Internal,
    disabled: !useExternal
  })

  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">
        {t('How Is Booking Going To Be Managed')}
      </FormLabel>
      <RadioGroup
        aria-label={t('How Is Booking Going To Be Managed')}
        value={state.value}
        name={name}
        onChange={(e) => {
          setState({
            disabled: e.target.value === Values.Internal,
            value: e.target.value
          })
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
        disabled={state.disabled}
        fullWidth={true}
        defaultValue={url}
      />
    </FormControl>
  )
}
