import {
  DaysOfWeek,
  Language,
  NonNullProperties,
  TranslationObject,
  UploadImageMeta
} from '~/types'
import { json } from 'remix'
import ComboBox from '~/components/shared/form/ComboBox'
import { useTranslation } from 'react-i18next'

function getDomainUrl(request: Request) {
  const host =
    request.headers.get('X-Forwarded-Host') ?? request.headers.get('host')
  if (!host) {
    throw new Error('>>Error<<: Could not determine domain URL')
  }
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return '>>Error<<: Unknown Error'
}

function getErrorStack(error: unknown) {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.stack
  return '>>Error<<: Unknown Error'
}

function getNonNull<Type extends Record<string, null | undefined | unknown>>(
  obj: Type
): NonNullProperties<Type> {
  for (const [key, val] of Object.entries(obj)) {
    assertNonNull(val, `The value of ${key} is null but it should not be.`)
  }
  return obj as NonNullProperties<Type>
}

function assertNonNull<PossibleNullType>(
  possibleNull: PossibleNullType,
  errorMessage: string
): asserts possibleNull is Exclude<PossibleNullType, null | undefined> {
  if (possibleNull == null) throw new Error(errorMessage)
}

function removeTrailingSlash(s: string) {
  return s.endsWith('/') ? s.slice(0, -1) : s
}

function typedBoolean<T>(
  value: T
): value is Exclude<T, '' | 0 | false | null | undefined> {
  return Boolean(value)
}

function badRequest<T>(data: T): Response {
  return json(data, { status: 400 })
}

const uploadImages = async (
  url: string,
  uploadPreset: string,
  images: Array<UploadImageMeta | undefined>
) => {
  const formData = new FormData()
  await Promise.all(
    images.map((image) => {
      if (!image) return null
      formData.append('file', image.file)
      formData.append('upload_preset', uploadPreset)
      formData.append('public_id', image.value)
      formData.append('timestamp', image.timestamp + '')
      formData.append('signature', image.signature)
      formData.append('api_key', image.apiKey)

      return new Promise<void>((resolve) => {
        fetch(url, {
          method: 'POST',
          body: formData
        })
          .then((response) => {
            return response.text()
          })
          .then((data) => {
            // intentionally left blank... we could/should log upload failures here
            resolve()
          })
      })
    })
  )
}

function getNullIfEmpty(value: string): string | null {
  return value ? value : null
}

function timeOfDayToHoursMinutes(value: number): [number, number] {
  const hours = Math.floor(value / 100)
  const minutes = value % 100
  return [hours, minutes]
}

function displayTimeOfDay(value: number): string {
  const [hours, minutes] = timeOfDayToHoursMinutes(value)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function PeekDayOfWeek(props: {
  name: string
  id: string
  defaultValue: DaysOfWeek | null
  addAll?: boolean
}) {
  const { t } = useTranslation('common')
  const { id, name, defaultValue, addAll } = props
  const options = [
    { value: 6, label: t('Sunday') },
    { value: 0, label: t('Monday') },
    { value: 1, label: t('Tuesday') },
    { value: 2, label: t('Wednesday') },
    { value: 3, label: t('Thursday') },
    { value: 4, label: t('Friday') },
    { value: 5, label: t('Saturday') }
  ]
  if (addAll) options.unshift({ value: -1, label: t('Any Day Of week') })
  return (
    <ComboBox
      name={name}
      id={id}
      defaultValue={defaultValue ? defaultValue : -1}
      options={options}
    />
  )
}

function getLocalizedText(language: Language, value?: TranslationObject) {
  if (!value) return ''
  return value[language]
}

export {
  getDomainUrl,
  getErrorMessage,
  getErrorStack,
  getNonNull,
  removeTrailingSlash,
  typedBoolean,
  badRequest,
  uploadImages,
  getNullIfEmpty,
  displayTimeOfDay,
  timeOfDayToHoursMinutes,
  PeekDayOfWeek,
  getLocalizedText
}
