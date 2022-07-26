import * as React from 'react'
import { hydrate } from 'react-dom'
import { RemixBrowser } from '@remix-run/react'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import Backend from "i18next-http-backend";
import { getInitialNamespaces } from "remix-i18next"
import I18nextBrowserLanguageDetector from 'i18next-browser-languagedetector'

i18next
  .use(initReactI18next)
  .use(I18nextBrowserLanguageDetector)
  .use(Backend)
  .init({
    supportedLngs: ['pt'],
    defaultNS: 'common',
    fallbackLng: 'pt',
    // I recommend you to always disable react.useSuspense for i18next
    react: { useSuspense: false },
    ns: getInitialNamespaces(),
    backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
    detection: {
      // Here only enable htmlTag detection, we'll detect the language only
      // server-side with remix-i18next, by using the `<html lang>` attribute
      // we can communicate to the client the language detected server-side
      order: ["htmlTag"],
      // Because we only use htmlTag, there's no reason to cache the language
      // on the browser, so we disable it
      caches: [],
    },
  })
  .then(() => {
    // then hydrate your app wrapped in the RemixI18NextProvider
    return hydrate(
      <I18nextProvider i18n={i18next}>
        <RemixBrowser />
      </I18nextProvider>,
      document
    )
  })
