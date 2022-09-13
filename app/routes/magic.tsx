import type { LoaderFunction } from 'remix';
import { Link } from '@remix-run/react';
import * as React from 'react';

import { redirect } from 'remix';

import { getLoginInfoSession } from '~/server/auth/login.server';
import { getUserSessionFromMagicLink } from '~/server/auth/session.server';
import { getErrorMessage } from '~/utils/misc';
import i18n, { ERRORS_NAMESPACE } from '~/server/i18n.server';
import { addGroupToFavorites } from '~/server/db/groups.server';

export const loader: LoaderFunction = async ({ request }) => {
  const loginInfoSession = await getLoginInfoSession(request);
  const t = await i18n.getFixedT(request, 'profile');

  try {
    const { session, action, group } = await getUserSessionFromMagicLink(
      request
    );

    if (session) {
      const headers = new Headers();

      loginInfoSession.clean();
      await loginInfoSession.getHeaders(headers);
      await session.getHeaders(headers);
      if (action === 'favorite') {
        const user = await session.getUser();

        if (user && group) {
          await addGroupToFavorites(user.id, group);
        }
        return redirect('/m/groups', { headers });
      }
      const user = await session.getUser();

      if (!user) {
        return redirect('/message', { headers });
      }

      const message = await t('Welcome back', {
        name: user.name
      });

      return redirect(`/?message=${message}`, { headers });
    }

    const url = new URL('https://a.com');

    if (group) {
      url.searchParams.append('g', group);
    }
    if (action) {
      url.searchParams.append('a', action);
    }

    return redirect(`/signup${url.search}`, {
      headers: await loginInfoSession.getHeaders()
    });
  } catch (error: unknown) {
    console.error(error);
    const te = await i18n.getFixedT(request, ERRORS_NAMESPACE);

    loginInfoSession.clean();
    loginInfoSession.flashError(
      await te(
        getErrorMessage(error) ||
          '>>Error<<: Sign in link invalid. Please request a new one'
      )
    );
    return redirect('/login', {
      headers: await loginInfoSession.getHeaders()
    });
  }
};

export default function Magic() {
  // we can't translate because we should never get here (unable to "download" translations when we issue a redirect)
  return (
    <div>
      <Link to="/">Home</Link>
    </div>
  );
}
