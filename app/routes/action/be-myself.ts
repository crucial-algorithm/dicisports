import type { LoaderFunction } from '@remix-run/node';
import { redirect } from 'react-router';

import { unImpersonateSession } from '~/server/auth/session.server';

export const loader: LoaderFunction = async ({ request }) => {
  await unImpersonateSession(request);

  // trying to force the "impersonate header" to disappear with the t= arg
  return redirect(`/?t=${Date.now()}`);
};
