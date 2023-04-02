import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

import { requireOrganizer, requireUser } from '~/server/auth/session.server';
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
  const user = await requireOrganizer(request);
  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const eventId = params.eventId as string;
  const documentId = params.id as string;
  const current = await findDocument(documentId);
  const event = await findEvent(eventId);

  if (!current) {
    throw NotFound(t('No Document'));
  }

  if (!event) {
    throw NotFound(t('Event not found'));
  }
  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }
  if (current.eventId !== eventId) {
    // weird - just in case, verify consistency in route
    throw NotFound(t('Document not found'));
  }

  const documents: Array<Document> = (await findDocuments(
    eventId
  )) as Document[];

  const position = documents.findIndex((d) => d.id === documentId);
  const previous = documents[position - 1];

  await updateDisplayOrderUp(current, previous);

  return json({});
};
