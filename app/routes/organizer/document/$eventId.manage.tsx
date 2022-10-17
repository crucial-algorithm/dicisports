import { Readable } from 'stream';

import type { ActionFunction } from 'remix';
import {
  json,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from 'remix';

import type { UploadHandler } from '@remix-run/node';
import { unstable_composeUploadHandlers } from '@remix-run/node';

import { z, ZodError } from 'zod';

import { requireAdminUser, requireUser } from '~/server/auth/session.server';
import {
  createDocument,
  deleteDocument,
  updateDocument
} from '~/server/documents.server';
import i18n from '~/server/i18n.server';
import type { CreateDocumentInput } from '~/types';
import { badRequest } from '~/utils/misc';
import { uploadToS3 } from '~/server/utils/s3';
import Id from '~/server/utils/Id.server';
import { findEvent } from '~/server/db/events.server';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminUser(request);
  const user = await requireUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, data, filename }) => {
      if (name !== 'file') {
        return undefined;
      }

      if (filename === undefined) {
        return undefined;
      }

      const eventId = params.eventId as string;
      const path = require('path');
      const fileExtension = path.parse(filename as string).ext;

      return await uploadToS3(
        Readable.from(data),
        eventId,
        Id() + fileExtension
      );
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  const form = await unstable_parseMultipartFormData(request, uploadHandler);

  const name = form.get('name') as string;
  const eventId = params.eventId as string;
  const documentId = form.get('documentId') as string;
  const hash = form.get('hash') as string;
  const actionId = form.get('actionId') as string;
  const file =
    form.get('file') === 'undefined' || form.get('file') === null
      ? undefined
      : form.get('file');

  const isInsert = !documentId;
  const documentData: CreateDocumentInput = {
    id: documentId,
    label: name,
    // @ts-ignore
    path: file,
    eventId
  };

  const event = await findEvent(eventId);

  if (!event) {
    return badRequest({ error: t('Event not found') });
  }
  if (event.createdById !== user.id) {
    return badRequest({ error: t('Not authorized') });
  }

  const DocumentSchema = z.object({
    label: z.string().min(5, { message: t('Min 5 chars') }),
    path: z
      .string()
      .optional()
      .refine(
        () => {
          if (!isInsert) {
            return true;
          }

          return documentData.path !== undefined;
        },
        {
          message: t('Select a document')
        }
      )
  });

  try {
    if (actionId === 'delete') {
      await deleteDocument(documentId);

      return json({ ok: true });
    }

    //If actionId is null or !== 'delete' check if there is a document and update or create
    DocumentSchema.parse(documentData);
    isInsert
      ? await createDocument(documentData)
      : await updateDocument(documentData);
    return json({ ok: true });
  } catch (e) {
    if (!(e instanceof ZodError)) {
      console.error(e);
      return badRequest({
        error: 'We dont know what happened'
      });
    }

    const errors: { [key: string]: string | undefined } = {};

    for (const error of (e as ZodError).errors) {
      errors[error.path[0]] = error.message;
    }

    return badRequest({ errors, hash: parseInt(hash) });
  }
};
