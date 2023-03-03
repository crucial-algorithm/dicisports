import type { LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';

import Id from '~/server/utils/Id.server';
import { createDraftGroup } from '~/server/db/groups.server';
import { requireUser } from '~/server/auth/session.server';

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);
  const id = Id();

  try {
    await createDraftGroup(user.id, id);
  } catch (err) {
    console.log(err);
    // TODO: redirect somewhere
  }
  return redirect(`/m/group/${id}`);
};
