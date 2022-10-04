import type { ActionFunction } from 'remix';
import { redirect } from 'remix';

import Id from '~/server/utils/Id.server';
import { createDraftGroup } from '~/server/db/groups.server';
import { requireUser } from '~/server/auth/session.server';

export const action: ActionFunction = async ({ request }) => {
  const user = await requireUser(request);
  const id = Id();

  try {
    await createDraftGroup(user.id, id);
  } catch (err) {
    console.log(err);
    // TODO: redirect somewhere
  }
  return redirect(`/g/group/${id}`);
};
