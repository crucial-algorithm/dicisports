import * as React from 'react'
import { hydrate } from 'react-dom'
import { RemixBrowser } from 'remix'
import { CacheProvider, ThemeProvider } from '@emotion/react'
import CssBaseline from '@mui/material/CssBaseline'
import createEmotionCache from './mui/createEmotionCache'
import theme from './mui/theme'
import { RemixI18NextProvider } from 'remix-i18next'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'

const emotionCache = createEmotionCache()

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
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={theme}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          <RemixI18NextProvider i18n={i18next}>
            <RemixBrowser />
          </RemixI18NextProvider>
        </ThemeProvider>
      </CacheProvider>,
      document
    )
  })
