import { resolve } from 'node:path';

import Backend from 'i18next-fs-backend';
import { RemixI18Next } from 'remix-i18next/server';

import i18nSettings from '../i18n';

const i18n = new RemixI18Next({
  detection: {
    supportedLanguages: i18nSettings.supportedLngs,
    fallbackLanguage: i18nSettings.fallbackLng
  },
  // This is the configuration for i18next used when translating messages server
  // side only
  i18next: {
    ...i18nSettings,
    backend: { loadPath: resolve('./public/locales/{{lng}}/{{ns}}.json') }
  },
  // The backend you want to use to load the translations
  // Tip: You could pass `resources` to the `i18next` configuration and avoid
  // a backend here
  backend: Backend
});

const ERRORS_NAMESPACE = 'server-errors';

export default i18n;
export { ERRORS_NAMESPACE };
