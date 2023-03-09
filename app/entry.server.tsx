import { resolve } from 'node:path';

import { PassThrough } from 'stream';

import * as React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { RemixServer } from '@remix-run/react';
import type { EntryContext } from '@remix-run/node';
import { createInstance } from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';

import Backend from 'i18next-fs-backend';

import i18n from '~/server/i18n.server';

const ABORT_DELAY = 5000;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  // First, we create a new instance of i18next so every request will have a
  // completely unique instance and not share any state
  const instance = createInstance();
  const lng = await i18n.getLocale(request);
  // @ts-ignore
  const ns = i18n.getRouteNamespaces(remixContext);

  await instance
    .use(initReactI18next) // Tell our instance to use react-i18next
    .use(Backend) // Setup our backend
    .init({
      // And configure i18next as usual
      supportedLngs: [ 'pt' ],
      defaultNS: 'common',
      fallbackLng: 'pt',
      // Disable suspense again here
      react: { useSuspense: false },
      lng, // The locale we detected above
      ns, // The namespaces the routes about to render want to use
      backend: {
        loadPath: resolve('./public/locales/{{lng}}/{{ns}}.json')
      }
    });

  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <I18nextProvider i18n={instance}>
        <RemixServer context={remixContext} url={request.url} />
      </I18nextProvider>,
      {
        onShellReady: () => {
          const body = new PassThrough();

          responseHeaders.set('Content-Type', 'text/html');

          resolve(
            // @ts-ignore
            new Response(body, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode
            })
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          didError = true;

          console.error(error);
        }
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
