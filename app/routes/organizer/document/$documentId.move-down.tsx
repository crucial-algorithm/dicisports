import type { ActionFunction } from 'remix';
import { json } from 'remix';

import type { Document } from '~/types';
import { requireAdminUser } from '~/server/auth/session.server';
import i18n from '~/server/i18n.server';
import {
  findDocument,
  findDocuments,
  updateDisplayOrderDown
} from '~/server/documents.server';
import { badRequest } from '~/utils/misc';

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminUser(request);

  const t = await i18n.getFixedT(request, 'create-event-from');

  const documentId = params.documentId as string;
  const current = await findDocument(documentId);

  if (!current) {
    return badRequest({ message: t('No Document') });
  }

  const eventId = current.eventId;
  const documents: Array<Document> = (await findDocuments(
    eventId
  )) as Document[];

  const position = documents.findIndex((d) => d.id === documentId);
  const next = documents[position + 1];

  await updateDisplayOrderDown(current, next);

  return json({});
};
