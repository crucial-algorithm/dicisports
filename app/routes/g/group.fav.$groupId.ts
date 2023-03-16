import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

import { requireUser } from '~/server/auth/session.server';
import {
  addGroupToFavorites,
  findGroup,
  removeGroupFromFavorites
} from '~/server/db/groups.server';

export const action: ActionFunction = async ({ request, params }) => {
  const user = await requireUser(
    request,
    `/login?a=favorite&g=${params.groupId}`
  );
  const group = params.groupId ? await findGroup(params.groupId) : null;

  if (!group) {
    return json({ added: false });
  }
  const data = await request.formData();
  const action = data.get('action') as string | 'add';

  try {
    if (action === 'add') {
      await addGroupToFavorites(user.id, group.id);
    }
    if (action === 'remove') {
      await removeGroupFromFavorites(user.id, group.id);
    }
    return json({ ok: true, action });
  } catch (e) {
    // @ts-ignore
    return json({ error: e.message });
  }
};
