import type { LoaderFunction } from 'remix';

import { requireAdminUser } from '~/server/auth/session.server';
import { downloadFromS3 } from '~/server/utils/s3';

export const loader: LoaderFunction = async ({ request, params }) => {
  // hide while this is still in dev
  await requireAdminUser(request);

  return downloadFromS3(params.eventId as string, params.key as string);
};
