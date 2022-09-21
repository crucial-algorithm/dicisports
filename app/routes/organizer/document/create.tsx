import type { ActionFunction } from 'remix';
import { json } from 'remix';

import { requireAdminUser } from '~/server/auth/session.server';
import { createDocument, updateDocument } from '~/server/documents.server';

export const action: ActionFunction = async ({ request }) => {
  await requireAdminUser(request);

  const form = await request.formData();

  const name = form.get('name') as string;
  const eventId = form.get('eventId') as string;
  const documentId = form.get('documentId') as string;

  documentId
    ? await updateDocument(name, documentId)
    : await createDocument(name, eventId);

  return json({ ok: true });
};
