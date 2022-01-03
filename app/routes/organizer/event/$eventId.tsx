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
import { Sport, Document, Event } from '@prisma/client'

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
  sports: Array<Sport>
  mapToken: string
  imageUploadEndpoint: string
  imageDisplayEndpoint: string
  imageUploadPreset: string
  files: Array<CloudinaryFileMeta>
  event: SportEvent | null
}

type SportEvent = Event & {
  documents?: Array<Document>
}

const badRequest = (data: ActionData) => json(data, { status: 400 })

export const loader: LoaderFunction = async ({ request, params }) => {
  const sports = await db.sport.findMany()
  const files = generateCloudinarySignatures(4)
  const event = await db.event.findUnique({
    where: { id: params.eventId },
    include: { documents: true }
  })

  return json({
    mapToken: process.env.MAPBOX_TOKEN,
    imageUploadEndpoint: process.env.IMAGE_UPLOAD_ENDPOINT,
    imageDisplayEndpoint: process.env.IMAGE_DISPLAY_ENDPOINT,
    imageUploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
    files,
    event,
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
  images: Array<Image | undefined>
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
const mapDbImages = (
  images: Array<Document> | undefined,
  url: string | undefined
): Array<string> => {
  if (!images || images.length === 0) return []
  return images
    .sort((a, b) => a.position - b.position)
    .map((img) => `${url}/${img.key}`)
}

export default function OrganizerEventRoute() {
  const { t } = useTranslation('create-event-form')
  const tc = useTranslation('common').t
  const {
    sports,
    mapToken,
    imageUploadEndpoint,
    imageUploadPreset,
    imageDisplayEndpoint,
    files,
    event
  } = useLoaderData<LoaderData>()
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false)
  const [location, setLocation] = useState<string | undefined | null>(
    event?.location
  )
  const images: Array<Image | undefined> = new Array(4)
  const loadedImages = mapDbImages(event?.documents, imageDisplayEndpoint)

  const setImages = (position: number) => (name: string, file: File) => {
    const meta: CloudinaryFileMeta | undefined = files[position]
    if (!meta)
      throw new Error(
        'No upload metadata for this file - did you increased the number of pictures in the form (limited to 4)?'
      )
    images[position] = {
      name,
      file,
      value: meta.publicId,
      timestamp: meta.timestamp,
      signature: meta.signature,
      apiKey: meta.apiKey
    }
  }

  return (
    <Box>
      <Typography variant="h4">{t('Create Event')}</Typography>
      <Form
        method="post"
        autoComplete="off"
        encType={encTypeUpload}
        onSubmit={(e) =>
          uploadImages(e, imageUploadEndpoint, imageUploadPreset, images)
        }
      >
        <TextField
          label={t('Name')}
          variant="standard"
          name="name"
          defaultValue={event?.name}
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
                defaultValue={event?.sportId}
              >
                {sports.map((sport) => (
                  <MenuItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={4}>
              <BasicDatePicker
                label={t('Date')}
                name="date"
                date={event?.startAt}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label={t('Location')}
                variant="standard"
                name="location"
                defaultValue={event?.address}
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
          <PickBookingSystem
            name="booking"
            t={t}
            useExternal={event?.useExternalBooking}
            url={event?.externalBookingUrl}
          />
        </Box>
        <Box sx={{ flexGrow: 1, mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <UploadImage
                name="image/1/file"
                label={t('Hint For Picture 1')}
                onDrop={setImages(0)}
                defaultValue={loadedImages[0]}
              />
              <input type="hidden" name="image/1" />
            </Grid>
            <Grid item xs={3}>
              <UploadImage
                name="image/2/file"
                label={t('Hint For Picture 2')}
                onDrop={setImages(1)}
                defaultValue={loadedImages[1]}
              />
              <input type="hidden" name="image/2" />
            </Grid>
            <Grid item xs={3}>
              <UploadImage
                name="image/3/file"
                label={t('Hint For Picture 3')}
                onDrop={setImages(2)}
                defaultValue={loadedImages[2]}
              />
              <input type="hidden" name="image/3" />
            </Grid>
            <Grid item xs={3}>
              <UploadImage
                name="image/4/file"
                label={t('Hint For Picture 4')}
                onDrop={setImages(3)}
                defaultValue={loadedImages[3]}
              />
              <input type="hidden" name="image/4" />
            </Grid>
          </Grid>
        </Box>

        <MapDialog
          token={mapToken}
          defaultValue={location}
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
