import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { RemixServer } from 'remix'
import type { EntryContext } from 'remix'

import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import { RemixI18NextProvider } from 'remix-i18next'

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  await i18next.use(initReactI18next).init({
    supportedLngs: ['pt'],
    defaultNS: 'common',
    fallbackLng: 'pt',
    react: { useSuspense: false }
  })

  const MuiRemixServer = () => (
    <RemixI18NextProvider i18n={i18next}>
      <RemixServer context={remixContext} url={request.url} />
    </RemixI18NextProvider>
  )

  const markup = renderToString(<MuiRemixServer />)

  responseHeaders.set('Content-Type', 'text/html')

  return new Response(`<!DOCTYPE html>${markup}`, {
    status: responseStatusCode,
    headers: responseHeaders
  })
}
