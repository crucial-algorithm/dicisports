import * as React from 'react'
import { hydrate } from 'react-dom'
import { RemixBrowser } from 'remix'
import { RemixI18NextProvider } from 'remix-i18next'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

i18next
  .use(initReactI18next)
  .init({
    supportedLngs: ['pt'],
    defaultNS: 'common',
    fallbackLng: 'pt',
    // I recommend you to always disable react.useSuspense for i18next
    react: { useSuspense: false }
  })
  .then(() => {
    // then hydrate your app wrapped in the RemixI18NextProvider
    return hydrate(
      <RemixI18NextProvider i18n={i18next}>
        <RemixBrowser />
      </RemixI18NextProvider>,
      document
    )
  })
