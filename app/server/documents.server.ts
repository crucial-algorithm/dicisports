import { PrismaClient } from '@prisma/client';

import { db } from '~/server/db.server';
import type { CreateDocumentInput, DBRawDocument, Document } from '~/types';
import Id from '~/server/utils/Id.server';

const prisma = new PrismaClient();

async function findDocument(id: string): Promise<Document | null> {
  return await db.document.findUnique({
    where: { id }
  });
}

async function findDocuments(eventId: string): Promise<Document[] | void> {
  return await db.document.findMany({
    where: { eventId, status: { not: 'deleted' }, isRegulation: false },
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
      path: document.path,
      createdAt: documentAt,
      updatedAt: documentAt,
      isRegulation: document.isRegulation,
      content: document.content,
      eventId: document.eventId
    }
  });
}

async function updateDocument(document: CreateDocumentInput): Promise<void> {
  const updatedAt = new Date();

  await db.document.update({
    where: { id: document.id },
    data: { label: document.label, updatedAt, content: document.content }
  });
}

async function updateDisplayOrderUp(
  current: Document,
  previous: Document
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    await prisma.document.update({
      where: { id: current.id },
      data: {
        position: previous.position
      }
    });

    await prisma.document.update({
      where: { id: previous.id },
      data: {
        position: current.position
      }
    });
  });
}

async function updateDisplayOrderDown(
  current: Document,
  next: Document
): Promise<void> {
  return await prisma.$transaction(async (prisma) => {
    await prisma.document.update({
      where: { id: current.id },
      data: {
        position: next.position
      }
    });

    await prisma.document.update({
      where: { id: next.id },
      data: {
        position: current.position
      }
    });
  });
}

async function deleteDocument(documentId: string): Promise<void> {
  await db.document.update({
    where: { id: documentId },
    data: {
      status: 'deleted'
    }
  });
}

async function findRegulation(eventId: string): Promise<Document | null> {
  const results: DBRawDocument[] = await db.$queryRaw`
    SELECT *
    FROM documents
    WHERE event_id = ${eventId}
      AND is_regulation = true;
  `;

  return results.length > 0
    ? {
        id: results[0].id,
        position: results[0].position,
        label: results[0].label,
        eventId: results[0].event_id,
        createdAt: results[0].created_at,
        updatedAt: results[0].updated_at,
        path: results[0].path,
        status: results[0].status,
        isRegulation: results[0].is_regulation,
        content: results[0].content ? results[0].content : null
      }
    : null;
}

export {
  findDocument,
  findDocuments,
  updateDocument,
  updateDisplayOrderUp,
  updateDisplayOrderDown,
  createDocument,
  deleteDocument,
  findRegulation
};
