import { RemixI18Next } from 'remix-i18next'
import { FileSystemBackend } from 'remix-i18next'

// You will need to provide a backend to load your translations, here we use the
// file system one and tell it where to find the translations.
const backend = new FileSystemBackend('./public/locales')

const i18n = new RemixI18Next(backend, {
  fallbackLng: 'pt', // here configure your default (fallback) language
  supportedLanguages: ['pt'] // here configure your supported languages
})

export default i18n
