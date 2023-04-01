import * as React from 'react';
import type { LinksFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
  useLoaderData,
  useMatches,
  useTransition
} from '@remix-run/react';

import { useSpinDelay } from 'spin-delay';

import clsx from 'clsx';

import { setConfig } from 'cloudinary-build-url';

import { locale } from 'primereact/api';

import primeIcons from 'primeicons/primeicons.css';
import primeReactCoreCss from 'primereact/resources/primereact.min.css';

import type { KCDHandle, Sport, User } from '~/types';
import type { Timings } from '~/server/metrics.server';
import { getServerTimeHeader, time } from '~/server/metrics.server';
import { getSession } from '~/server/auth/session.server';
import { getLoginInfoSession } from '~/server/auth/login.server';
import { getDomainUrl } from '~/utils/misc';
import { getClientSession } from '~/server/auth/client.server';
import { NotificationMessage } from '~/components/shared/NotificationMessage';

import type { Theme } from '~/utils/theme-provider';
import { ThemeProvider, useTheme } from '~/utils/theme-provider';
import { getThemeSession } from '~/server/theme.server';

import { Navbar } from '~/components/NavBar';

import TransitionIndicator from '~/components/shared/TransitionIndicator';

import Config from '~/server/config.server';

import { LocationProvider } from '~/utils/LocationProvider';
import { getLocationSession } from '~/routes/action/set-my-location';

import { findSports } from '~/server/db/reference.server';

import setupPrimeReact from '~/PrimeReact';

import vendorsCss from './styles/vendors.css';
import mainCss from './styles/main.css';
import primeReactThemeCss from './styles/primereact-theme.css';
import tailwind from './styles/tailwind.css';


export const links: LinksFunction = () => {
  return [
    {
      rel: 'preload',
      as: 'font',
      href: '/fonts/Poppins-Medium.woff2',
      type: 'font/woff2',
      crossOrigin: 'anonymous'
    },
    {
      rel: 'preload',
      as: 'font',
      href: '/fonts/Poppins-Regular.woff2',
      type: 'font/woff2',
      crossOrigin: 'anonymous'
    },
    {
      rel: 'stylesheet',
      href: vendorsCss
    },
    {
      rel: 'stylesheet',
      href: tailwind
    },
    {
      rel: 'stylesheet',
      href: mainCss
    },
    {
      rel: 'stylesheet',
      href: primeIcons
    },
    {
      rel: 'stylesheet',
      href: primeReactThemeCss
    },
    {
      rel: 'stylesheet',
      href: primeReactCoreCss
    }
  ];
};

export const handle: KCDHandle & { id: string; i18n: string[] } = {
  id: 'root',
  i18n: ['common', 'home']
};

export type RootLoaderData = {
  user: User | null;
  ENV: { CLOUDINARY_CLOUD_NAME: string };
  requestInfo: {
    canonicalUrl: string;
    origin: string;
    path: string;
    session: {
      email: string | undefined;
      theme: Theme | null;
      location: [number, number] | null;
    };
  };
  sports: Array<Sport>
};

export const loader: LoaderFunction = async ({ request }) => {
  function getUser() {
    return session.getUser();
  }

  const timings: Timings = {};
  const session = await getSession(request);
  const themeSession = await getThemeSession(request);
  const clientSession = await getClientSession(request);
  const loginInfoSession = await getLoginInfoSession(request);
  const locationSession = await getLocationSession(request);
  const sports = await findSports();

  const user = await time({
    name: 'getUser in root loader',
    type: 'postgres read',
    timings,
    fn: getUser
  });

  const data: RootLoaderData = {
    user,
    ENV: {
      CLOUDINARY_CLOUD_NAME: Config().CLOUDINARY_CLOUD_NAME
    },
    requestInfo: {
      canonicalUrl: request.url
        .replace('www.', '')
        .replace('http://', 'https://'),
      origin: getDomainUrl(request),
      path: new URL(request.url).pathname,
      session: {
        email: loginInfoSession.getEmail(),
        theme: themeSession.getTheme(),
        location: locationSession.getLocation()
      }
    },
    sports
  };

  const headers = new Headers();

  headers.append('Server-Timing', getServerTimeHeader(timings));
  // this can lead to race conditions if a child route is also trying to commit
  // the cookie as well. This is a bug in remix that will hopefully be fixed.
  // we reduce the likelihood of a problem by only committing if the value is
  // different.
  await session.getHeaders(headers);
  await clientSession.getHeaders(headers);
  await loginInfoSession.getHeaders(headers);

  return json(data, { headers });
};

/* temporary = from kentcdodds.com implementation */
const LOADER_WORDS = [
  'loading',
  'checking cdn',
  'checking cache',
  'fetching from db',
  'compiling mdx',
  'updating cache',
  'transfer'
];
const ACTION_WORDS = [
  'packaging',
  'zapping',
  'validating',
  'processing',
  'calculating',
  'computing',
  'computering'
];

let firstRender = true;

function PageLoadingMessage() {
  const transition = useTransition();
  const [words, setWords] = React.useState<Array<string>>([]);
  const [pendingPath, setPendingPath] = React.useState('');
  const showLoader = useSpinDelay(Boolean(transition.state !== 'idle'), {
    delay: 400,
    minDuration: 1000
  });

  React.useEffect(() => {
    if (firstRender) {
      return;
    }
    if (transition.state === 'idle') {
      return;
    }
    if (transition.state === 'loading') {
      setWords(LOADER_WORDS);
    }
    if (transition.state === 'submitting') {
      setWords(ACTION_WORDS);
    }

    const interval = setInterval(() => {
      setWords(([first, ...rest]) => [...rest, first] as Array<string>);
    }, 2000);

    return () => clearInterval(interval);
  }, [pendingPath, transition.state]);

  React.useEffect(() => {
    if (firstRender) {
      return;
    }
    if (transition.state === 'idle') {
      return;
    }
    setPendingPath(transition.location.pathname);
  }, [transition]);

  React.useEffect(() => {
    firstRender = false;
  }, []);

  const action = words[0];

  return (
    <TransitionIndicator
      visible={showLoader}
      action={action}
      secondary={pendingPath}
    />
  );
}

function Html({
  lang
}: {
  lang: string;
}) {
  const [theme] = useTheme();
  const data = useLoaderData<RootLoaderData>() as RootLoaderData;
  const analyticsUrl = 'https://plausible.io/js/plausible.js';
  const [, { pathname }] = useMatches();

  // useChangeLanguage(lang);
  // script bellow setting window.ENV is not actually being used; Just keeping
  // in case we need other vars to be available and for debugging in production
  setConfig({
    cloudName: data.ENV.CLOUDINARY_CLOUD_NAME
  });

  // Support for cypress command that waits for HTML to be hydrated
  React.useEffect(() => (
      document.getElementsByTagName('body').item(0) as HTMLBodyElement
    ).setAttribute('data-cy', 'ready'),
    [lang]
  );

  return (
    <html
      lang={lang}
      className={clsx(theme, 'set-color-team-current-red')}
      dir="ltr"
    >
      <head>
        {process.env.NODE_ENV === 'production' && (
          <>
            <script defer data-domain="dicisports.com" src={analyticsUrl} />
            <link rel="canonical" href={data.requestInfo.canonicalUrl} />
          </>
        )}

        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="dark:bg-gray-900 bg-white transition duration-500 w-full">
        <PageLoadingMessage />
        <NotificationMessage queryStringKey="message" delay={0.3} />
        {pathname !== '/o' && <Navbar />}
        <Outlet />
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data.ENV)}`
          }}
        />
        <Scripts />
        {process.env.NODE_ENV === 'development' && <LiveReload />}
      </body>
    </html>
  );
}

export default function App() {
  // set locale statically
  const lang = 'pt';
  const data = useLoaderData<RootLoaderData>() as RootLoaderData;

  locale(lang);

  setupPrimeReact();

  return (
    <ThemeProvider specifiedTheme={data.requestInfo.session.theme}>
      <LocationProvider userLocation={data.requestInfo.session.location}>
        <Html lang={lang} />
      </LocationProvider>
    </ThemeProvider>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div>
      <h1 className="font-extrabold">There was an error</h1>
      <p>{error.message}</p>
      <hr />
      <p>
        Hey, developer, you should replace this with what you want your users to
        see.
      </p>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  let message;

  switch (caught.status) {
    case 401:
      message = (
        <p>
          Oops! Looks like you tried to visit a page that you do not have access
          to.
        </p>
      );
      break;
    case 404:
      message = (
        <p>Oops! Looks like you tried to visit a page that does not exist.</p>
      );
      break;

    default:
      throw new Error(caught.data || caught.statusText);
  }

  return (
    <html lang="en" className="dark">
      <head>
        <title>{`${caught.status} ${caught.statusText}`}</title>
        <Links />
      </head>
      <body className="dark:bg-gray-900 bg-white transition duration-500">
        <div>
          <h1>{message}</h1>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
