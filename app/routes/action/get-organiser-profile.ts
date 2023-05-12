import type { LoaderFunction } from '@remix-run/node';
import { Role } from '@prisma/client';
import { json } from '@remix-run/node';

import { getUser } from '~/server/auth/session.server';
import { findOrganiser } from '~/server/db/organiser.server';

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);

  if (!user || user.role !== Role.ORGANIZER) {
    return json({});
  }

  const organiser = await findOrganiser(user.id);

  return json({ organiser });
};
