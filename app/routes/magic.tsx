import type { LoaderFunction } from 'remix'
import { Link, redirect } from 'remix'
import * as React from 'react'
import { getLoginInfoSession } from '~/utils/login.server'
import { getUserSessionFromMagicLink } from '~/utils/session.server'
import { getErrorMessage } from '~/utils/misc'
import { SSError } from '~/utils/i18n.server'

export const loader: LoaderFunction = async ({ request }) => {
  const loginInfoSession = await getLoginInfoSession(request)
  try {
    const session = await getUserSessionFromMagicLink(request)
    loginInfoSession.setMagicLinkVerified(true)
    if (session) {
      const headers = new Headers()
      loginInfoSession.clean()
      await loginInfoSession.getHeaders(headers)
      await session.getHeaders(headers)
      return redirect('/me', { headers })
    }

    loginInfoSession.setMagicLink(request.url)
    return redirect('/signup', {
      headers: await loginInfoSession.getHeaders()
    })
  } catch (error: unknown) {
    console.error(error)
    loginInfoSession.clean()
    loginInfoSession.flashError(
      getErrorMessage(error) ||
        (await SSError(
          '>>Error<<: Sign in link invalid. Please request a new one'
        ))
    )
    return redirect('/login', {
      headers: await loginInfoSession.getHeaders()
    })
  }
}

export default function Magic() {
  // we can't translate because we should never get here (unable to "download" translations when we issue a redirect)
  return (
    <div>
      <Link to="/">Home</Link>
    </div>
  )
}
