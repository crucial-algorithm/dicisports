import type { LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';

import type { KCDHandle } from '~/types';

import { findActiveUrl } from '~/server/db/shortener.server';

export const handle: KCDHandle & { id: string; i18n: string[] } = {
  id: 'shortener',
  i18n: []
};

// shortner route: redirect to target url

export const loader: LoaderFunction = async ({ request, params }) => {
  if (!params.url) {
    return redirect('/');
  }
  const short = await findActiveUrl(params.url);

  if (!short) {
    return redirect('/');
  }

  return redirect(short.target);
};

export default async function ShortenerRoute() {
  return (
    <div>you should never see this... you can close the window if you do</div>
  );
}
