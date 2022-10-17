import type { ActionFunction } from 'remix';
import { json } from 'remix';

import { requireAdminUser, requireUser } from '~/server/auth/session.server';
import i18n from '~/server/i18n.server';

import type { Document } from '~/types';
import {
  findDocument,
  findDocuments,
  updateDisplayOrderUp
} from '~/server/documents.server';
import { findEvent } from '~/server/db/events.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminUser(request);
  const user = await requireUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);
  const documentId = params.documentId as string;
  const current = await findDocument(documentId);

  if (!current) {
    throw NotFound(t('No Document'));
  }

  const eventId = current.eventId as string;
  const event = await findEvent(eventId);

  if (!event) {
    throw NotFound(t('Event not found'));
  }
  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  const documents: Array<Document> = (await findDocuments(
    eventId
  )) as Document[];

  const position = documents.findIndex((d) => d.id === documentId);
  const previous = documents[position - 1];

  await updateDisplayOrderUp(current, previous);

  return json({});
};
