import * as React from 'react'
import {
  json,
  Links,
  LinksFunction,
  LiveReload,
  LoaderFunction,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
  useTransition
} from 'remix'
import { useRemixI18Next } from 'remix-i18next'
import tailwind from './styles/tailwind.css'
import mainCss from './styles/main.css'
import vendorsCss from './styles/vendors.css'
import { User } from '@prisma/client'
import { KCDHandle } from '~/types'
import { getServerTimeHeader, time, Timings } from '~/server/metrics.server'
import { getSession } from '~/server/auth/session.server'
import { getLoginInfoSession } from '~/server/auth/login.server'
import { getDomainUrl } from '~/utils/misc'
import { getClientSession } from '~/server/auth/client.server'
import { pathedRoutes } from '~/other-routes.server'
import { useSpinDelay } from 'spin-delay'
import { NotificationMessage } from '~/components/shared/NotificationMessage'
import { AnimatePresence, motion } from 'framer-motion'
import { TeamCircle } from '~/components/shared/icons/TeamCircle'
import i18n from '~/server/i18n.server'
import { useLoaderData } from '@remix-run/react'
import { Theme, ThemeProvider, useTheme } from '~/utils/theme-provider'
import { getThemeSession } from '~/server/theme.server'
import clsx from 'clsx'
import { Navbar } from '~/components/NavBar'
import CAGResponse from '~/server/response.server'

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
    }
  ]
}

export const handle: KCDHandle & { id: string } = {
  id: 'root'
}

export type LoaderData = {
  user: User | null
  requestInfo: {
    origin: string
    path: string
    session: {
      email: string | undefined
      magicLinkVerified: boolean | undefined
      theme: Theme | null
    }
  }
}

export const loader: LoaderFunction = async ({ request }) => {
  // because this is called for every route, we'll do an early return for anything
  // that has a other route setup. The response will be handled there.
  if (pathedRoutes[new URL(request.url).pathname]) {
    return new Response()
  }

  const timings: Timings = {}
  const session = await getSession(request)
  const themeSession = await getThemeSession(request)
  const clientSession = await getClientSession(request)
  const loginInfoSession = await getLoginInfoSession(request)

  const user = await time({
    name: 'getUser in root loader',
    type: 'postgres read',
    timings,
    fn: () => session.getUser()
  })

  const data: LoaderData = {
    user,
    requestInfo: {
      origin: getDomainUrl(request),
      path: new URL(request.url).pathname,
      session: {
        email: loginInfoSession.getEmail(),
        magicLinkVerified: loginInfoSession.getMagicLinkVerified(),
        theme: themeSession.getTheme()
      }
    }
  }

  const headers: HeadersInit = new Headers()
  headers.append('Server-Timing', getServerTimeHeader(timings))
  // this can lead to race conditions if a child route is also trying to commit
  // the cookie as well. This is a bug in remix that will hopefully be fixed.
  // we reduce the likelihood of a problem by only committing if the value is
  // different.
  await session.getHeaders(headers)
  await clientSession.getHeaders(headers)
  await loginInfoSession.getHeaders(headers)

  return CAGResponse(request, data, headers)
}

/* temporary = from kentcdodds.com implementation */
const LOADER_WORDS = [
  'loading',
  'checking cdn',
  'checking cache',
  'fetching from db',
  'compiling mdx',
  'updating cache',
  'transfer'
]
const ACTION_WORDS = [
  'packaging',
  'zapping',
  'validating',
  'processing',
  'calculating',
  'computing',
  'computering'
]

let firstRender = true

function PageLoadingMessage() {
  const transition = useTransition()
  const [words, setWords] = React.useState<Array<string>>([])
  const [pendingPath, setPendingPath] = React.useState('')
  const showLoader = useSpinDelay(Boolean(transition.state !== 'idle'), {
    delay: 400,
    minDuration: 1000
  })

  React.useEffect(() => {
    if (firstRender) return
    if (transition.state === 'idle') return
    if (transition.state === 'loading') setWords(LOADER_WORDS)
    if (transition.state === 'submitting') setWords(ACTION_WORDS)

    const interval = setInterval(() => {
      setWords(([first, ...rest]) => [...rest, first] as Array<string>)
    }, 2000)

    return () => clearInterval(interval)
  }, [pendingPath, transition.state])

  React.useEffect(() => {
    if (firstRender) return
    if (transition.state === 'idle') return
    setPendingPath(transition.location.pathname)
  }, [transition])

  React.useEffect(() => {
    firstRender = false
  }, [])

  const action = words[0]

  return (
    <NotificationMessage position="bottom-right" visible={showLoader}>
      <div className="flex items-center w-64">
        <motion.div
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          animate={{ rotate: 360 }}
        >
          <TeamCircle size={48} />
        </motion.div>
        <div className="inline-grid ml-4">
          <AnimatePresence>
            <div className="flex col-start-1 row-start-1 overflow-hidden">
              <motion.span
                key={action}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -15, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex-none"
              >
                {action}
              </motion.span>
            </div>
          </AnimatePresence>
          <span className="text-secondary truncate">path: {pendingPath}</span>
        </div>
      </div>
    </NotificationMessage>
  )
}

function Html({ title = 'DiciSports' }: { title?: string }) {
  const [theme] = useTheme()
  return (
    <html lang="pt" className={clsx(theme, 'set-color-team-current-red')}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{title}</title>
        <Meta />
        <Links />
      </head>
      <body className="dark:bg-gray-900 bg-white transition duration-500 w-full">
        <PageLoadingMessage />
        <NotificationMessage queryStringKey="message" delay={0.3} />
        <Navbar />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        {process.env.NODE_ENV === 'development' && <LiveReload />}
      </body>
    </html>
  )
}

export default function App() {
  // set locale statically
  // https://www.npmjs.com/package/remix-i18next
  useRemixI18Next('pt')
  const data = useLoaderData<LoaderData>()

  return (
    <ThemeProvider specifiedTheme={data.requestInfo.session.theme}>
      <Html />
    </ThemeProvider>
  )
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>Oh no...</title>
        <Links />
      </head>
      <body className="dark:bg-gray-900 bg-white transition duration-500">
        <div>
          <h1>There was an error</h1>
          <p>{error.message}</p>
          <hr />
          <p>
            Hey, developer, you should replace this with what you want your
            users to see.
          </p>
        </div>
        <Scripts />
      </body>
    </html>
  )
}

export function CatchBoundary() {
  const caught = useCatch()

  let message
  switch (caught.status) {
    case 401:
      message = (
        <p>
          Oops! Looks like you tried to visit a page that you do not have access
          to.
        </p>
      )
      break
    case 404:
      message = (
        <p>Oops! Looks like you tried to visit a page that does not exist.</p>
      )
      break

    default:
      throw new Error(caught.data || caught.statusText)
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
  )
}
