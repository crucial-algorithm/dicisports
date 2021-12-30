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
import BasicDatePicker from '~/components/DatePicker'
import { LocationOn } from '@mui/icons-material'
import PickBookingSystem from '~/components/newEvent/PickBookingSystem'
import { FormEvent, useState } from 'react'
import { MapDialog } from '~/components/Map'
import mapBoxGlCss from 'mapbox-gl/dist/mapbox-gl.css'
import mapCss from '~/styles/map.css'
import organizerCss from '~/styles/organizer.css'
import UploadImage from '~/components/UploadImage'
import { UploadHandler } from '@remix-run/node/formData'
import { parseMultipartFormData } from '@remix-run/node/parseMultipartFormData'
import i18n from '~/utils/i18n.server'
import { useTranslation } from 'react-i18next'
import {
  CloudinaryFileMeta,
  generateCloudinarySignatures
} from '~/utils/cloudinary.server'

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
  IMAGE_ENDPOINT: string
  UPLOAD_PRESET: string
  files: Array<CloudinaryFileMeta>
}

const badRequest = (data: ActionData) => json(data, { status: 400 })

export const loader: LoaderFunction = async ({ request }) => {
  const sports = await db.sport.findMany()
  const files = generateCloudinarySignatures(4)

  return json({
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
    IMAGE_ENDPOINT: process.env.IMAGE_ENDPOINT,
    UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
    files,
    sports: sports.map((sport) => {
      return { id: sport.id, name: sport.name }
    }),
    i18n: await i18n.getTranslations(request, ['common', 'create-event-form'])
  })
}

export const action: ActionFunction = async ({ request }) => {
  const uploadHandler: UploadHandler = async () => {
    // cleanup images from form - upload is done directly to cloudinary
    return undefined
  }
  let form = await parseMultipartFormData(request, uploadHandler)
  const x = 1

  console.log('form = ', form)
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
      href: mapCss
    },
    {
      rel: 'stylesheet',
      href: organizerCss
    }
  ]
}

type Image = {
  name: string
  file: File
  value: string
  timestamp: number
  signature: string
  apiKey: string
}

const uploadImages = (
  e: FormEvent<HTMLFormElement>,
  url: string,
  uploadPreset: string,
  images: Array<Image>
) => {
  const formData = new FormData()
  images.map((image) => {
    if (!image) return null
    formData.append('file', image.file)
    formData.append('upload_preset', uploadPreset)
    formData.append('public_id', image.value)
    formData.append('timestamp', image.timestamp + '')
    formData.append('signature', image.signature)
    formData.append('api_key', image.apiKey)

    fetch(url, {
      method: 'POST',
      body: formData
    })
      .then((response) => {
        return response.text()
      })
      .then((data) => {
        // intentionally left blank... we could/should log upload failures here
      })

    // file input has name like "image/1/file" and hidden shadow has "image/1"
    const hiddenFieldName = image.name.replace('/file', '')
    const field: HTMLInputElement | null =
      document.querySelector<HTMLInputElement>(`[name="${hiddenFieldName}"]`)
    if (field) field.value = image.value

    return null
  })
}
const encTypeUpload = 'multipart/form-data'

export default function OrganizerIndexRoute() {
  const { t } = useTranslation('create-event-form')
  const tc = useTranslation('common').t
  const { sports, MAPBOX_TOKEN, IMAGE_ENDPOINT, UPLOAD_PRESET, files } =
    useLoaderData<LoaderData>()
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false)
  const [location, setLocation] = useState<string>('')
  const images: Array<Image> = []
  const setImages = (name: string, file: File) => {
    const meta: CloudinaryFileMeta | undefined = files.pop()
    if (!meta)
      throw new Error(
        'No upload metadata for this file - did you increased the number of pictures in the form (limited to 4)?'
      )
    images.push({
      name,
      file,
      value: meta.publicId,
      timestamp: meta.timestamp,
      signature: meta.signature,
      apiKey: meta.apiKey
    })
  }

  return (
    <Box>
      <Typography variant="h4">{t('Create Event')}</Typography>
      <Form
        method="post"
        autoComplete="off"
        encType={encTypeUpload}
        onSubmit={(e) => uploadImages(e, IMAGE_ENDPOINT, UPLOAD_PRESET, images)}
      >
        <TextField
          label={t('Name')}
          variant="standard"
          name="name"
          fullWidth={true}
          sx={{ mb: 2 }}
        />
        <Box sx={{ flexGrow: 1, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <TextField
                label={t('Sport')}
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
              <BasicDatePicker label={t('Date')} name="date" />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label={t('Location')}
                variant="standard"
                name="location"
                value={location}
                onClick={() => setShowLocationPicker(true)}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={t('Location Aria Tip')}
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
          <PickBookingSystem name="booking" t={t} />
        </Box>
        <Box sx={{ flexGrow: 1, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <UploadImage
                name="image/1/file"
                label={t('Hint For Picture 1')}
                onDrop={setImages}
              />
              <input type="hidden" name="image/1" />
            </Grid>
            <Grid item xs={3}>
              <UploadImage
                name="image/2/file"
                label={t('Hint For Picture 2')}
                onDrop={setImages}
              />
              <input type="hidden" name="image/2" />
            </Grid>
            <Grid item xs={3}>
              <UploadImage
                name="image/3/file"
                label={t('Hint For Picture 3')}
                onDrop={setImages}
              />
              <input type="hidden" name="image/3" />
            </Grid>
            <Grid item xs={3}>
              <UploadImage
                name="image/4/file"
                label={t('Hint For Picture 4')}
                onDrop={setImages}
              />
              <input type="hidden" name="image/4" />
            </Grid>
          </Grid>
        </Box>

        <MapDialog
          token={MAPBOX_TOKEN}
          open={showLocationPicker}
          setClosed={() => setShowLocationPicker(false)}
          onPickedLocation={(location) =>
            setLocation(location?.shortAddress || '')
          }
          t={tc}
        />
        <Button type="submit" variant="contained">
          {t('Create Button')}
        </Button>
      </Form>
    </Box>
  )
}
