import { db } from '~/server/db.server';
import type { CreateDocumentInput, Document } from '~/types';
import Id from '~/server/utils/Id.server';

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

async function createDocument(
  document: CreateDocumentInput
): Promise<Document | void> {
  const documentId = Id();
  const documentAt = new Date();

  await db.document.create({
    data: {
      id: documentId,
      label: document.label,
      key: document.key,
      createdAt: documentAt,
      updatedAt: documentAt,
      eventId: document.eventId
    }
  });
}

async function updateDocument(document: CreateDocumentInput): Promise<void> {
  await db.document.update({
    where: { id: document.id },
    data: { label: document.label }
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

async function updateDisplayOrderDown(
  current: Document,
  next: Document
): Promise<void> {
  await db.document.update({
    where: { id: current.id },
    data: {
      position: next.position
    }
  });

  await db.document.update({
    where: { id: next.id },
    data: {
      position: current.position
    }
  });
}

export {
  findDocument,
  findDocuments,
  updateDocument,
  updateDisplayOrderUp,
  updateDisplayOrderDown,
  createDocument
};
