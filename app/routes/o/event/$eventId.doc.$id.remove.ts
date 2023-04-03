import type { ActionFunction } from '@remix-run/node';
import { json } from '@remix-run/node';

import { requireUser } from '~/server/auth/session.server';
import { findEvent } from '~/server/db/events.server';
import { NotFound } from '~/server/utils/misc';
import i18n from '~/server/i18n.server';
import { deleteDocument, findDocument } from '~/server/documents.server';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
    const t = await i18n.getFixedT(request, RESOURCES_NS);

    const user = await requireUser(request);
    
    const eventId = params.eventId as string;
    const documentId = params.id as string;
  
    const event = await findEvent(eventId);
    
    if (!event || event.createdById !== user.id) {
        throw NotFound(t('Event not found'));
    }
    
    const document = await findDocument(documentId);
    
    if (!document) {
        throw NotFound(t('Document not found'));
    }
    
    await deleteDocument(documentId);

    return json({ ok: true });
};