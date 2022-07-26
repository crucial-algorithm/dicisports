import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { RemixServer } from 'remix'
import type { EntryContext } from 'remix'
import i18next, { createInstance } from 'i18next'
import { initReactI18next, I18nextProvider } from 'react-i18next'
import i18n from '~/server/i18n.server'
import Backend from "i18next-fs-backend"
import { resolve } from "node:path"

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  context: EntryContext
) {
  // First, we create a new instance of i18next so every request will have a
  // completely unique instance and not share any state
  const instance = createInstance()
  const lng = await i18n.getLocale(request)
  const ns = i18n.getRouteNamespaces(context)

  await instance
    .use(initReactI18next) // Tell our instance to use react-i18next
    .use(Backend) // Setup our backend
    .init({
      // And configure i18next as usual
      supportedLngs: ['pt'],
      defaultNS: 'common',
      fallbackLng: 'pt',
      // Disable suspense again here
      react: { useSuspense: false },
      lng, // The locale we detected above
      ns, // The namespaces the routes about to render want to use
      backend: {
        loadPath: resolve("./public/locales/{{lng}}/{{ns}}.json"),
      },
    });

  const markup = renderToString(
    <I18nextProvider i18n={instance}>
      <RemixServer context={context} url={request.url} />
    </I18nextProvider>
  )

  responseHeaders.set('Content-Type', 'text/html')

  return new Response(`<!DOCTYPE html>${markup}`, {
    status: responseStatusCode,
    headers: responseHeaders
  })
}
