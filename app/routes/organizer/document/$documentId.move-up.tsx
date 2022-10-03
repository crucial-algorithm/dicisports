import type { ActionFunction } from 'remix';
import { json } from 'remix';

import { requireAdminUser } from '~/server/auth/session.server';
import i18n from '~/server/i18n.server';

import type { Document } from '~/types';
import {
  findDocument,
  findDocuments,
  updateDisplayOrderUp
} from '~/server/documents.server';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);
  const documentId = params.documentId as string;
  const current = await findDocument(documentId);

  if (!current) {
    throw new Response(t('No Document'), {
      status: 404
    });
  }

  const eventId = current.eventId as string;
  const documents: Array<Document> = (await findDocuments(
    eventId
  )) as Document[];

  const position = documents.findIndex((d) => d.id === documentId);
  const previous = documents[position - 1];

  await updateDisplayOrderUp(current, previous);

  return json({});
};
