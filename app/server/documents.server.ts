import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

import { db } from '~/server/db.server';
import type { Document } from '~/types';

const prisma = new PrismaClient();

async function findDocument(id: string): Promise<Document | null> {
  return await db.document.findUnique({
    where: { id }
  });
}

async function findDocuments(eventId: string): Promise<Document[] | void> {
  return await db.document.findMany({
    where: { eventId, status: { not: 'deleted' } },
    orderBy: { position: 'asc' }
  });
}

async function createDocument(
  data: Prisma.DocumentCreateInput
): Promise<Document | void> {

  await db.document.create({
    data
  });
}

async function updateDocument(id: string, label: string): Promise<void> {
  await db.document.update({
    where: { id },
    data: { label }
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

export {
  findDocument,
  findDocuments,
  updateDocument,
  updateDisplayOrderUp,
  updateDisplayOrderDown,
  createDocument,
  deleteDocument
};
