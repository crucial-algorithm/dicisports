import Main from '~/components/shared/Main'
import { H2, H3, Paragraph } from '~/components/shared/typography'
import {
  ActionFunction,
  LinksFunction,
  LoaderFunction,
  redirect,
  useActionData,
  useSubmit
} from 'remix'
import { requireUser } from '~/server/auth/session.server'
import CAGResponse from '~/server/response.server'
import { findSports } from '~/server/db/sports.server'
import { deleteGroup, findGroup, updateGroup } from '~/server/db/groups.server'
import { useTranslation } from 'react-i18next'
import { Grid } from '~/components/shared/Grid'
import { Form, useLoaderData } from '@remix-run/react'
import Button from '~/components/shared/Button'
import FormField from '~/components/shared/form/FormField'
import TextField from '~/components/shared/form/TextField'
import {
  DiciLocation,
  UploadImageMeta,
  Group,
  GroupSpirit,
  GroupType,
  Sport,
  Language
} from '~/types'
import ComboBox from '~/components/shared/form/ComboBox'
import { findGroupTypes } from '~/server/db/groupTypes.server'
import HourOfDay from '~/components/HourOfDay'
import { findGroupsSpirit } from '~/server/db/groupsSpirit.server'
import { useState } from 'react'
import { MapDialog } from '~/components/shared/Map'
import Config from '~/server/config.server'
import UploadImage from '~/components/shared/form/UploadImage'
import { UploadHandler } from '@remix-run/node/formData'
import { parseMultipartFormData } from '@remix-run/node/parseMultipartFormData'
import {
  badRequest,
  hoursMinutesToTimeOfDay,
  PeekDayOfWeek,
  timeOfDayToHoursMinutes,
  uploadImages
} from '~/utils/misc'
import UploadForm from '~/components/shared/form/UploadForm'
import mapCss from '~/styles/map.css'
import vendorsCss from '~/styles/vendors.css'
import {
  CloudinaryFileMeta,
  generateCloudinarySignatures
} from '~/server/storage/cloudinary.server'
import { z, ZodError } from 'zod'
import { SSTranslations } from '~/server/i18n.server'
import InputError from '~/components/shared/form/InputError'
import TransitionIndicator from '~/components/shared/TransitionIndicator'
import { Dialog } from '@reach/dialog'
import { Spacer } from '~/components/shared/Spacer'

const RESOURCES_NS = 'groups-form'

type LoaderData = {
  sports: Array<Sport>
  groupTypes: Array<GroupType>
  groupsSpirit: Array<GroupSpirit>
  group: Group

  mapToken: string
  imageUploadEndpoint: string
  imageDisplayEndpoint: string
  imageUploadPreset: string
  files: Array<CloudinaryFileMeta>
}

const actionIds = {
  delete: 'delete'
}

export const links: LinksFunction = () => {
  return [
    {
      rel: 'stylesheet',
      href: mapCss
    },
    {
      rel: 'stylesheet',
      href: vendorsCss
    }
  ]
}

export let loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request)
  const {
    MAPBOX_TOKEN,
    IMAGE_UPLOAD_ENDPOINT,
    IMAGE_DISPLAY_ENDPOINT,
    CLOUDINARY_UPLOAD_PRESET
  } = Config()

  const files = generateCloudinarySignatures(3)
  const group = params.groupId ? await findGroup(params.groupId) : null
  if (!group || group.createdById !== user.id) return redirect('/m/groups')

  return CAGResponse(
    request,
    {
      sports: await findSports(),
      groupTypes: await findGroupTypes(),
      groupsSpirit: await findGroupsSpirit(),
      group,
      groupId: params.groupId,

      mapToken: MAPBOX_TOKEN,
      imageUploadEndpoint: IMAGE_UPLOAD_ENDPOINT,
      imageDisplayEndpoint: IMAGE_DISPLAY_ENDPOINT,
      imageUploadPreset: CLOUDINARY_UPLOAD_PRESET,
      files
    },
    undefined,
    [RESOURCES_NS]
  )
}

type ActionData = {
  error?: string
  errors?: {
    name?: string
    location?: string
    near?: string
  }
}

function imgFullId(prefix: string, uuid: string | null): string | null {
  return uuid ? `${prefix}${uuid}` : null
}

function processImgField(
  prefix: string,
  value: string | null,
  isUpdate: boolean
): string | null | undefined {
  if (isUpdate && !value) return undefined
  return imgFullId(prefix, value)
}

function parseLocation(location: string) {
  const [coords, address] = location.split('|')
  const [lat, lng] = coords.split(',')
  return {
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    address
  }
}

export const action: ActionFunction = async ({ request, params }) => {
  const user = await requireUser(request)
  const uploadHandler: UploadHandler = async () => {
    // cleanup images from form - upload is done directly to cloudinary
    return undefined
  }
  const form = await parseMultipartFormData(request, uploadHandler)
  const p = Config().CLOUDINARY_UPLOAD_FOLDER_TARGET
  const action = form.get('actionId') as string

  // Check if user should be able to manipulate this group
  const group = params.groupId ? await findGroup(params.groupId) : null
  const translate = await SSTranslations('groups-form')

  if (!group) return badRequest({ error: translate('Group not found') })
  if (group.createdById !== user.id)
    return badRequest({ error: translate('Not authorized') })

  // from here on, the user is capable of doing whatever to the group
  if (action === actionIds.delete) {
    await deleteGroup(group.id)
    return redirect(
      `/m/groups?message=${translate('Group deleted successfully')}`
    )
  }
  const isUpdate = group.status !== 'auto'
  const image1 = form.get('/image/0') as string
  const image2 = form.get('/image/1') as string
  const image3 = form.get('/image/2') as string
  const location = parseLocation(form.get('location') as string)
  const data = {
    id: form.get('id') as string,
    name: form.get('name') as string,
    sportId: parseInt(form.get('sport') as string),
    groupTypeId: parseInt(form.get('type') as string),
    groupSpiritId: parseInt(form.get('spirit') as string),
    location: location.address,
    lat: location.lat,
    lng: location.lng,
    near: form.get('near') as string,
    dayOfWeek: parseInt(form.get('dayOfWeek') as string),
    timeOfDay: hoursMinutesToTimeOfDay(
      parseInt(form.get('hour') as string, 10),
      parseInt(form.get('minute') as string, 10)
    ),
    image1: processImgField(p, image1, isUpdate),
    image2: processImgField(p, image2, isUpdate),
    image3: processImgField(p, image3, isUpdate)
  }
  const required = { invalid_type_error: translate('Field required') }
  const str5CharsOrMore = z
    .string(required)
    .min(5, { message: translate('Name 5 chars or more') })
  const GroupSchema = z.object({
    name: str5CharsOrMore,
    location: z.string(required),
    near: str5CharsOrMore
  })

  try {
    GroupSchema.parse(data)

    await updateGroup(data)

    return redirect(
      `/m/groups?message=${translate(
        isUpdate ? 'Group updated successfully' : 'Group created successfully'
      )}`
    )
  } catch (excp) {
    if (!(excp instanceof ZodError)) {
      return badRequest({
        error: translate('We dont know what happened')
      })
    }
    const errors: { [key: string]: string | undefined } = {}

    for (const error of (excp as ZodError).errors) {
      errors[error.path[0]] = error.message
    }

    return badRequest({ error: undefined, errors })
  }
}

export default function GroupRoute() {
  const { t, i18n } = useTranslation(RESOURCES_NS)
  const language = i18n.language as Language
  const loadedData = useLoaderData<LoaderData>()
  const {
    mapToken,
    sports,
    groupTypes,
    groupsSpirit,
    files,
    imageUploadEndpoint,
    imageUploadPreset,
    group
  } = loadedData
  const isUpdate = group.status !== 'auto'
  // using parse float for 0 min's to work
  const [hour, minute] = timeOfDayToHoursMinutes(group.timeOfDay)
  const images: Array<UploadImageMeta | undefined> = new Array(3)
  const actionData = useActionData<ActionData>()
  const [uploading, setImagesUploading] = useState<boolean>(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)

  const setImage = (index: number, file: File) => {
    const meta: CloudinaryFileMeta | undefined = files[index]
    if (!meta)
      throw new Error(
        'No upload metadata for this file - did you increased the number of pictures in the form (limited to 4)?'
      )
    images[index] = {
      name: `/image/${index}`,
      file,
      value: meta.publicId,
      timestamp: meta.timestamp,
      signature: meta.signature,
      apiKey: meta.apiKey
    }
  }

  // open map stuff
  const [showLocationPicker, setShowLocationPicker] = useState<boolean>(false)
  const [location, setLocation] = useState<DiciLocation | null>(
    group.location
      ? {
          coords: group.location.split('|')[0],
          shortAddress: group.location.split('|')[1]
        }
      : null
  )
  const submit = useSubmit()

  return (
    <Main>
      <div className="mb-64 mt-24 pt-6">
        <Grid>
          <div className="col-span-full mb-12 lg:mb-20">
            <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
              <div>
                <H2 className="px-11">{t(`Ride Together`)}</H2>
                <H3 variant="secondary" as="p">
                  {t('Let Others know')}
                </H3>
              </div>
            </div>
          </div>

          <div className="col-span-full mb-24 lg:col-span-full lg:mb-0">
            <UploadForm
              method="post"
              className="w-full"
              onSubmit={async (e) => {
                e.preventDefault()
                setImagesUploading(true)
                await uploadImages(
                  imageUploadEndpoint,
                  imageUploadPreset,
                  images
                )
                setImagesUploading(false)
                submit(e.target as HTMLFormElement)
              }}
            >
              <input type="hidden" name="id" value={group?.id || ''} />
              <FormField
                label={t('Group Name')}
                id="group-name"
                className="md:w-120 lg:w-144 w-160"
                error={actionData?.errors?.name}
              >
                <TextField
                  name="name"
                  id="group-sport"
                  defaultValue={group.name || ''}
                />
              </FormField>
              <FormField
                label={t('Group Sport')}
                id="group-sport"
                className="w-64"
              >
                <ComboBox
                  name="sport"
                  id="group-sport"
                  lang={language}
                  placeholder=""
                  defaultValue={group.sport ? group.sport.id : undefined}
                  options={sports.map((s) => {
                    return { value: s.id, label: s.name }
                  })}
                />
              </FormField>
              <FormField
                label={t('Group Type')}
                id="group-type"
                className="w-64"
              >
                <ComboBox
                  name="type"
                  id="group-type"
                  lang={language}
                  placeholder=""
                  defaultValue={
                    group.groupType ? group.groupType.id : undefined
                  }
                  options={groupTypes.map((g) => {
                    return { value: g.id, label: g.name }
                  })}
                />
              </FormField>
              <FormField
                label={t('Group Spirit')}
                id="group-spirit"
                className="w-64"
              >
                <ComboBox
                  name="spirit"
                  id="group-spirit"
                  placeholder=""
                  lang={language}
                  defaultValue={
                    group.groupSpirit ? group.groupSpirit.id : undefined
                  }
                  options={groupsSpirit.map((g) => {
                    return { value: g.id, label: g.name }
                  })}
                />
              </FormField>
              <FormField
                label={t('Group Location')}
                id="group-location"
                className="w-112"
                error={actionData?.errors?.location}
              >
                <TextField
                  name="discard-location"
                  id="group-sport"
                  defaultValue={location?.shortAddress}
                  disabled={true}
                  adornment={
                    <Button
                      className="mr-2"
                      variant="adornment"
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                    >
                      {t('Map')}
                    </Button>
                  }
                />
                <input
                  type="hidden"
                  name="location"
                  value={
                    location
                      ? `${location?.coords}|${location?.shortAddress}`
                      : undefined
                  }
                />
              </FormField>
              <FormField
                label={t('Group Location Helper')}
                id="group-location-helper"
                className="w-112"
                error={actionData?.errors?.near}
              >
                <TextField
                  name="near"
                  id="group-location-helper"
                  placeholder={t('Group Location Helper Placeholder')}
                  defaultValue={group.near || ''}
                />
              </FormField>
              <FormField
                label={t('Day Of Week')}
                id="group-day-of-week"
                className="w-64"
              >
                <PeekDayOfWeek
                  name="dayOfWeek"
                  id="group-day-of-week"
                  defaultValue={group.dayOfWeek}
                />
              </FormField>
              <FormField
                label={t('Time Of Day')}
                id="group-time-of-day"
                className="w-48"
              >
                <HourOfDay hour={hour} minute={minute} />
              </FormField>
              <FormField label={t('Group Photos')} id="group-photos">
                <div className="grid gap-4 grid-cols-3 grid-rows-1">
                  <UploadImage
                    index={0}
                    imageId={files[0].publicId}
                    label={t('Hint For Picture 1')}
                    onDrop={setImage}
                    defaultValue={group.image1}
                  />
                  <UploadImage
                    index={1}
                    imageId={files[1].publicId}
                    label={t('Hint For Picture 2')}
                    onDrop={setImage}
                    defaultValue={group.image2}
                  />
                  <UploadImage
                    index={2}
                    imageId={files[2].publicId}
                    label={t('Hint For Picture 3')}
                    onDrop={setImage}
                    defaultValue={group.image3}
                  />
                </div>
              </FormField>
              <Button
                className="mt-8"
                type="submit"
                form="profile-form"
                disabled={uploading}
              >
                {uploading
                  ? t('Button While Uploading Images')
                  : isUpdate
                  ? t('Update Group')
                  : t('Create Group')}
              </Button>
              <InputError id="global-error" className="mt-4">
                {actionData?.error}
              </InputError>
            </UploadForm>
            {isUpdate ? (
              <Form
                method="post"
                className="mt-24 border-t border-gray-300 dark:border-gray-300 pt-6"
              >
                <input type="hidden" name="actionId" value={actionIds.delete} />
                <Button
                  variant="danger"
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  {t('Delete Group')}
                </Button>
              </Form>
            ) : null}
          </div>
        </Grid>
      </div>
      <MapDialog
        token={mapToken}
        defaultValue={location}
        open={showLocationPicker}
        onClose={(location) => {
          setShowLocationPicker(false)
          setLocation(location)
        }}
      />
      <Dialog
        onDismiss={() => setDeleteModalOpen(false)}
        isOpen={deleteModalOpen}
        aria-label="Delete your account"
        className="w-11/12 dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg lg:px-24 lg:py-14 lg:max-w-screen-lg"
      >
        <H3>{t('Delete Group X', { name: group?.name })}</H3>
        <Paragraph>{t('Are you sure you want to delete group?')}</Paragraph>
        <Spacer size="2xs" />
        <Form
          id="profile-form"
          method="post"
          noValidate
          aria-describedby="general-error"
        >
          <input type="hidden" name="actionId" value={actionIds.delete} />
          <div className="flex flex-wrap gap-4">
            <Button type="button" onClick={() => setDeleteModalOpen(false)}>
              {t("No, I don't want to delete")}
            </Button>
            <Button variant="danger" size="medium" type="submit">
              {t('Delete Group')}
            </Button>
          </div>
        </Form>
      </Dialog>
      <TransitionIndicator visible={uploading} action={t('Uploading Images')} />
    </Main>
  )
}
