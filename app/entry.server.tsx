import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { RemixServer } from 'remix'
import type { EntryContext } from 'remix'

import createEmotionCache from './mui/createEmotionCache'
import theme from './mui/theme'

import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { CacheProvider } from '@emotion/react'
import createEmotionServer from '@emotion/server/create-instance'
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { RemixI18NextProvider } from 'remix-i18next'

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  const cache = createEmotionCache()
  const { extractCriticalToChunks } = createEmotionServer(cache)

  await i18next.use(initReactI18next).init({
    supportedLngs: ['pt'],
    defaultNS: 'common',
    fallbackLng: 'pt',
    react: { useSuspense: false }
  })

  const MuiRemixServer = () => (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />
        <RemixI18NextProvider i18n={i18next}>
          <RemixServer context={remixContext} url={request.url} />
        </RemixI18NextProvider>
      </ThemeProvider>
    </CacheProvider>
  )

  // Render the component to a string.
  const html = renderToString(<MuiRemixServer />)

  // Grab the CSS from emotion
  const { styles } = extractCriticalToChunks(html)

  let stylesHTML = ''

  styles.forEach(({ key, ids, css }) => {
    const emotionKey = `${key} ${ids.join(' ')}`
    const newStyleTag = `<style data-emotion='${emotionKey}'>${css}</style>`
    stylesHTML = `${stylesHTML}${newStyleTag}`
  })

  // Add the emotion style tags after the insertion point meta tag
  const markup = html.replace(
    /<meta(\s)*name="emotion-insertion-point"(\s)*content="emotion-insertion-point"(\s)*\/>/,
    `<meta name='emotion-insertion-point' content='emotion-insertion-point'/>${stylesHTML}`
  )

  responseHeaders.set('Content-Type', 'text/html')

  return new Response(`<!DOCTYPE html>${markup}`, {
    status: responseStatusCode,
    headers: responseHeaders
  })
}
