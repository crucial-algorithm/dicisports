import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { Form, useLoaderData } from '@remix-run/react'
import {
  Button,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField
} from '@mui/material'
import { ActionFunction, json, LinksFunction, LoaderFunction } from 'remix'
import { db } from '~/utils/db.server'
import BasicDatePicker from '~/ui/DatePicker'
import { LocationOn } from '@mui/icons-material'
import PickBookingSystem from '~/components/PickBookingSystem'
import { useState } from 'react'
import { MapDialog } from '~/components/Map'
import mapBoxGlCss from 'mapbox-gl/dist/mapbox-gl.css'
import routeCss from '~/styles/map.css'

type ActionData = {
  formError?: string
  fieldErrors?: {
    name: string | undefined
    content: string | undefined
  }
  fields?: {
    name: string
    content: string
  }
}

type LoaderData = {
  sports: Array<{ id: number; name: string }>
  MAPBOX_TOKEN: string
}

const badRequest = (data: ActionData) => json(data, { status: 400 })

export const loader: LoaderFunction = async ({ request }) => {
  const sports = await db.sport.findMany()

  return {
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
    sports: sports.map((sport) => {
      return { id: sport.id, name: sport.name }
    })
  }
}

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData()
  console.log(form)
  const x = 1
  if (x === 1) {
    return badRequest({
      formError: `Form not submitted correctly.`
    })
  }
}

export const links: LinksFunction = () => {
  return [
    {
      rel: 'stylesheet',
      href: mapBoxGlCss
    },
    {
      rel: 'stylesheet',
      href: routeCss
    }
  ]
}

export default function OrganizerIndexRoute() {
  const { sports, MAPBOX_TOKEN } = useLoaderData<LoaderData>()
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false)
  const [location, setLocation] = useState<string>('')

  return (
    <Box>
      <Typography variant="h4">Create Event</Typography>
      <Form method="post" autoComplete="off">
        <TextField
          label="Nome"
          variant="standard"
          name="name"
          fullWidth={true}
          sx={{ mb: 2 }}
        />
        <Box sx={{ flexGrow: 1, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                label="Desporto"
                select
                variant="standard"
                name="sport"
                fullWidth={true}
              >
                {sports.map((sport) => (
                  <MenuItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={4}>
              <BasicDatePicker label="Data" name="date" />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Localização"
                variant="standard"
                name="location"
                value={location}
                onClick={() => setShowLocationPicker(true)}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Pick location"
                        onClick={() => setShowLocationPicker(true)}
                        edge="end"
                      >
                        <LocationOn />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                fullWidth={true}
              />
            </Grid>
          </Grid>
        </Box>
        <Box sx={{ flexGrow: 1, mb: 2 }}>
          <PickBookingSystem name="booking" />
        </Box>
        <MapDialog
          token={MAPBOX_TOKEN}
          open={showLocationPicker}
          setClosed={() => setShowLocationPicker(false)}
          onPickedLocation={(location) =>
            setLocation(location?.shortAddress || '')
          }
        />
        <Button type="submit" variant="contained">
          Criar
        </Button>
      </Form>
    </Box>
  )
}
