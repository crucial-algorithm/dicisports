import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField
} from '@mui/material'
import { useState } from 'react'

const useYourOwnTrackingSystem = 'Guardar no DiciSports'
const useExternalTrackingSystem =
  'Estou a usar um sistema externo (ex. O da empresa de cronometragem)'

export type PickBookingSystemOptions = {
  name: string
}

export default function PickBookingSystem({ name }: PickBookingSystemOptions) {
  const [disabled, setDisabled] = useState<boolean>(true)
  return (
    <FormControl component="fieldset">
      <FormLabel component="legend">
        Como pretende tratar das inscrições?
      </FormLabel>
      <RadioGroup
        aria-label="gender"
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
          label={useYourOwnTrackingSystem}
        />
        <FormControlLabel
          value="external"
          control={<Radio />}
          label={useExternalTrackingSystem}
        />
      </RadioGroup>
      <TextField
        label="Link para endereço do booking"
        name={`${name}-url`}
        variant="standard"
        disabled={disabled}
        fullWidth={true}
      />
    </FormControl>
  )
}
