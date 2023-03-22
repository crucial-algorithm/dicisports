import type { LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

import { getEventResultsByName } from '~/server/db/events.server';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get('s');

  // We only start returning values after the 3rd char
  if (!searchTerm || (searchTerm && searchTerm.length <= 2)) {
    return json({});
  }

  const data = await getEventResultsByName(searchTerm);

  return json(data);
};
