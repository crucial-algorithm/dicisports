import { startTransition, StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { RemixBrowser } from '@remix-run/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import { getInitialNamespaces } from 'remix-i18next';
import I18nextBrowserLanguageDetector from 'i18next-browser-languagedetector';

import i18nSettings from './i18n';

async function hydrate() {
  await i18next
    .use(initReactI18next) // Tell i18next to use the react-i18next plugin
    .use(I18nextBrowserLanguageDetector) // Setup a client-side language detector
    .use(Backend) // Setup your backend
    .init({
      ... i18nSettings, // spread the configuration
      // This function detects the namespaces your routes rendered while SSR use
      ns: getInitialNamespaces(),
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
        // @ts-ignore
        queryStringParams: { v: window.ENV.RELEASE }
      },
      detection: {
        // Here only enable htmlTag detection, we'll detect the language only
        // server-side with remix-i18next, by using the `<html lang>` attribute
        // we can communicate to the client the language detected server-side
        order: [ 'htmlTag' ],
        // Because we only use htmlTag, there's no reason to cache the language
        // on the browser, so we disable it
        caches: []
      }
    });

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <RemixBrowser />
        </StrictMode>
      </I18nextProvider>
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  window.setTimeout(hydrate, 1);
}
