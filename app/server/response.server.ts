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
  translations?: Array<string>
): Promise<Response> {
  const path = new URL(request.url).pathname.substr(1)

  if (Array.isArray(data)) {
    translations = data
    data = undefined
  }

  translations = translations || []
  translations.push('common')

  if (path && !exclusions.includes(path)) translations.push(path)

  const init: ResponseInit | null = headers ? { headers } : null
  const payload = {
    ...data,
    i18n: await i18n.getTranslations(request, translations)
  }

  if (init) return json(payload, init)
  return json(payload)
}

export default CAGResponse
