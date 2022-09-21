import { db } from '~/server/db.server';
import type { Document } from '~/types';
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
  name: string,
  eventId: string
): Promise<Document | void> {
  const documentId = Id();
  const documentAt = new Date();

  //TODO: change hard coded "key" value
  await db.document.create({
    data: {
      id: documentId,
      label: name,
      key: 'delete',
      createdAt: documentAt,
      updatedAt: documentAt,
      eventId
    }
  });
}

async function updateDocument(name: string, documentId: string): Promise<void> {
  await db.document.update({
    where: { id: documentId },
    data: { label: name }
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
