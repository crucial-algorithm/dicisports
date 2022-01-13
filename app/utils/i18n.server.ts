import { RemixI18Next } from 'remix-i18next'
import { FileSystemBackend } from 'remix-i18next'

const backend = new FileSystemBackend('./public/locales')

const i18n = new RemixI18Next(backend, {
  fallbackLng: 'pt', // here configure your default (fallback) language
  supportedLanguages: ['pt'] // here configure your supported languages
})

export default i18n

// We should be doing this with i18n functions... but don't know how!!
// Check https://github.com/sergiodxa/remix-i18next for a SSR solution
const ERRORS_NAMESPACE = 'server-errors'

async function SSTranslate(
  namespace: string,
  key: string,
  params?: { [key: string]: string }
) {
  const translations = await i18n.getTranslations('pt', [
    namespace,
    ERRORS_NAMESPACE
  ])
  // @ts-ignore
  return translate(translations, namespace, key, params)
}

async function SSTranslations(
  namespace: string
): Promise<(key: string, params?: { [key: string]: string }) => string> {
  const translations = await i18n.getTranslations('pt', [
    namespace,
    ERRORS_NAMESPACE
  ])
  return (key, params?) => {
    // @ts-ignore
    return translate(translations, namespace, key, params)
  }
}

async function SSError(key: string, params?: { [key: string]: string }) {
  return SSTranslate(ERRORS_NAMESPACE, key, params)
}

function translate(
  translations: { [key: string]: { [key: string]: string } },
  namespace: string,
  key: string,
  params?: { [key: string]: string }
): string {
  if (!key) throw new Error(`Hey developer, to translate we need a key`)
  if (!translations[namespace])
    throw new Error(
      `Hey developer, translation namespace ${namespace} does not exist`
    )
  const translation: string =
    (translations[namespace][key] as string) ||
    translations[ERRORS_NAMESPACE][key]

  if (!translation) return key
  if (!params) return translation
  return interpolate(translation, params)
}

function interpolate(translation: string, params: { [key: string]: string }) {
  let result: string = translation
  for (const k of Object.keys(params)) {
    result = result.replace(`{{${k}}}`, params[k])
  }
  return result
}

export { SSTranslations, SSTranslate, SSError, ERRORS_NAMESPACE }
