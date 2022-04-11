import { json } from 'remix'
import i18n from '~/server/i18n.server'

const exclusions = ['magic']

async function CAGResponse(request: Request): Promise<Response>

async function CAGResponse(
  request: Request,
  translations: Array<string>
): Promise<Response>

async function CAGResponse(
  request: Request,
  data?: object,
  headers?: HeadersInit
): Promise<Response>

async function CAGResponse(
  request: Request,
  data?: object,
  headers?: HeadersInit,
  translations?: Array<string>
): Promise<Response>

async function CAGResponse(
  request: Request,
  data?: object,
  headers?: HeadersInit,
  translations?: Array<string>,
  exclusive?: boolean
): Promise<Response>

async function CAGResponse(
  request: Request,
  data?: object,
  headers?: HeadersInit,
  translations?: Array<string>,
  exclusive?: boolean //only include translations in translations (required by routes with $slug)
): Promise<Response> {
  const path = new URL(request.url).pathname.substr(1).replace('/', '-')

  if (Array.isArray(data)) {
    translations = data
    data = undefined
  }

  translations = translations || []
  translations.push('common')

  if (
    path &&
    !path.includes('/') &&
    !exclusions.includes(path) &&
    exclusive !== true
  ) {
    translations.push(path)
    console.log('not exclusive:', exclusive, translations)
  }

  const init: ResponseInit | null = headers ? { headers } : null
  const payload = {
    ...data,
    i18n: await i18n.getTranslations(request, translations)
  }

  if (init) return json(payload, init)
  return json(payload)
}

export default CAGResponse
