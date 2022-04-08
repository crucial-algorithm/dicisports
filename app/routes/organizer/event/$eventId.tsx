import { Form, useLoaderData } from '@remix-run/react'
import { ActionFunction, json, LinksFunction, LoaderFunction } from 'remix'
import BasicDatePicker from '~/components/shared/form/DatePicker'
import PickBookingSystem from '~/components/PickBookingSystem'
import { useState } from 'react'
import { MapDialog } from '~/components/shared/Map'
import mapBoxGlCss from 'mapbox-gl/dist/mapbox-gl.css'
import mapCss from '~/styles/map.css'
import organizerCss from '~/styles/organizer.css'
import UploadImage from '~/components/shared/form/UploadImage'
import { UploadHandler } from '@remix-run/node/formData'
import { parseMultipartFormData } from '@remix-run/node/parseMultipartFormData'
import i18n from '~/server/i18n.server'
import { useTranslation } from 'react-i18next'
import {
  CloudinaryFileMeta,
  generateCloudinarySignatures
} from '~/server/storage/cloudinary.server'
import { Sport, Document, Event } from '~/types'
import Header from '~/components/shared/Header'
import TextField from '~/components/shared/form/TextField'
import Button from '~/components/shared/Button'
import { LocationMarkerIcon } from '@heroicons/react/outline'
import { inputBaseClasses } from '~/components/shared/form/InputBase'
import Config from '~/server/config.server'
import { findSports } from '~/server/db/sports.server'
import { findEvent } from '~/server/db/events.server'
import Main from '~/components/shared/Main'
import I18nText from '~/components/I18nText'
import FormField from '~/components/shared/form/FormField'
import { uploadImages } from '~/utils/misc'

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
  const sports = await findSports()
  const files = generateCloudinarySignatures(4)
  const event = params.eventId ? await findEvent(params.eventId) : null

  const {
    MAPBOX_TOKEN,
    IMAGE_UPLOAD_ENDPOINT,
    IMAGE_DISPLAY_ENDPOINT,
    CLOUDINARY_UPLOAD_PRESET
  } = Config()

  return json({
    mapToken: MAPBOX_TOKEN,
    imageUploadEndpoint: IMAGE_UPLOAD_ENDPOINT,
    imageDisplayEndpoint: IMAGE_DISPLAY_ENDPOINT,
    imageUploadPreset: CLOUDINARY_UPLOAD_PRESET,
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

  // eslint-disable-next-line no-console
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

function hackyEventRevival(event: Event | null): void {
  if (!event) return
  // @ts-ignore
  event.startAt = new Date(event.startAt)
  // @ts-ignore
  event.endAt = new Date(event.endAt)
}

export default function OrganizerEventRoute() {
  const { t } = useTranslation('create-event-form')
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
  const [, setLocation] = useState<string | undefined | null>(event?.location)
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

  // Hack: while remix doesn't handle dates properly
  hackyEventRevival(event)

  return (
    <Main>
      <Header>{t('Create Event')}</Header>
      <Form
        method="post"
        autoComplete="off"
        encType={encTypeUpload}
        onSubmit={(e) =>
          uploadImages(e, imageUploadEndpoint, imageUploadPreset, images)
        }
      >
        <div className="shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 bg-white sm:p-6">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6">
                <FormField label={t('Name')}>
                  <TextField name="name" defaultValue={event?.name || ''} />
                </FormField>
              </div>
              <div className="col-span-6 sm:col-span-6 lg:col-span-2">
                <label
                  htmlFor="sport"
                  className="block text-sm font-medium text-gray-700"
                >
                  {t('Sport')}
                </label>
                <select
                  className={inputBaseClasses()}
                  name="sport"
                  id="sport"
                  defaultValue={event?.sportId || ''}
                >
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {I18nText({ text: sport.name })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-6 sm:col-span-6 lg:col-span-2">
                <BasicDatePicker
                  label={t('Date')}
                  name="date"
                  date={event?.startAt}
                />
              </div>
              <div className="col-span-6 sm:col-span-6 lg:col-span-2">
                <FormField label={t('Location')}>
                  <TextField
                    name="location"
                    defaultValue={event?.address || ''}
                    adornment={
                      <Button
                        type="button"
                        aria-label={t('Location Aria Tip')}
                        onClick={() => setShowLocationPicker(true)}
                        size="small"
                        className="inline-block align-middle"
                      >
                        <LocationMarkerIcon className="h-6 w-6 m-0 inline-block" />
                      </Button>
                    }
                  />
                </FormField>
              </div>
              <div className="col-span-6 sm:col-span-6">
                <PickBookingSystem
                  name="booking"
                  t={t}
                  useExternal={event?.useExternalBooking}
                  url={event?.externalBookingUrl}
                />
              </div>
              <div className="col-span-1">
                <div>
                  <UploadImage
                    name="image/1/file"
                    label={t('Hint For Picture 1')}
                    onDrop={setImages(0)}
                    defaultValue={loadedImages[0]}
                  />
                  <input type="hidden" name="image/1" />
                </div>
              </div>

              <div className="col-span-1">
                <div>
                  <UploadImage
                    name="image/2/file"
                    label={t('Hint For Picture 2')}
                    onDrop={setImages(0)}
                    defaultValue={loadedImages[0]}
                  />
                  <input type="hidden" name="image/2" />
                </div>
              </div>

              <div className="col-span-1">
                <div>
                  <UploadImage
                    name="image/3/file"
                    label={t('Hint For Picture 3')}
                    onDrop={setImages(0)}
                    defaultValue={loadedImages[0]}
                  />
                  <input type="hidden" name="image/3" />
                </div>
              </div>

              <div className="col-span-1">
                <div>
                  <UploadImage
                    name="image/4/file"
                    label={t('Hint For Picture 4')}
                    onDrop={setImages(0)}
                    defaultValue={loadedImages[0]}
                  />
                  <input type="hidden" name="image/4" />
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <Button>{t('Create Button')}</Button>
          </div>
        </div>
      </Form>
      <MapDialog
        token={mapToken}
        defaultValue={null}
        open={showLocationPicker}
        setClosed={() => setShowLocationPicker(false)}
        onPickedLocation={(location) =>
          setLocation(location?.shortAddress || '')
        }
      />
    </Main>
  )
}
