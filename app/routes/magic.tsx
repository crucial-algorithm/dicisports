import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';
import { Link } from '@remix-run/react';
import * as React from 'react';

import { getLoginInfoSession } from '~/server/auth/login.server';
import {
  getSession,
  getUserSessionFromMagicLink
} from '~/server/auth/session.server';
import i18n from '~/server/i18n.server';

export const loader: LoaderFunction = async ({ request }) => {
  const loginInfoSession = await getLoginInfoSession(request);
  const t = await i18n.getFixedT(request, 'profile');

  const { session: s } = await getUserSessionFromMagicLink(request);

  if (!s) {
    return redirect(`/recover?e=${t('Recover Password Failed')}`);
  }

  const user = await s.getUser();

  if (!user) {
    return redirect(`/recover?e=${t('Recover Password Failed')}`);
  }

  const session = await getSession(request);
  const headers = new Headers();

  await session.signIn(user);
  await session.getHeaders(headers);
  loginInfoSession.clean();
  await loginInfoSession.getHeaders(headers);

  return redirect('/reset', {
    headers
  });
};

export default function Magic() {
  // we can't translate because we should never get here (unable to "download" translations when we issue a redirect)
  return (
    <div>
      <Link to="/">Home</Link>
    </div>
  );
}
