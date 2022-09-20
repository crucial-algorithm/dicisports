import { db } from '~/server/db.server';
import type { Document } from '~/types';

async function findDocument(id: string): Promise<Document | null> {
  return await db.document.findUnique({
    where: { id }
  });
}

async function findDocuments(eventId: string): Promise<Document[] | void> {
  return await db.document.findMany({
    where: { eventId },
    orderBy: { position: 'asc' }
  });
}

async function updateDisplayOrderUp(
  current: Document,
  previous: Document
): Promise<void> {
  await db.document.update({
    where: { id: current.id },
    data: {
      position: previous.position
    }
  });

  await db.document.update({
    where: { id: previous.id },
    data: {
      position: current.position
    }
  });
}

export { findDocument, findDocuments, updateDisplayOrderUp };
