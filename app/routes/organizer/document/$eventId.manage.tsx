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

import { requireAdminUser } from '~/server/auth/session.server';
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

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  await requireAdminUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, contentType, data, filename }) => {
      if (name !== 'file') {
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
  const file = form.get('file');

  const documentData: CreateDocumentInput = {
    id: documentId,
    label: name,
    key: file as string,
    eventId
  };

  const DocumentSchema = z.object({
    label: z.string().min(5, { message: t('Min 5 chars') })
  });

  try {
    if (actionId === 'delete') {
      await deleteDocument(documentId);

      return json({ ok: true });
    }
    DocumentSchema.parse(documentData);
    documentId
      ? await updateDocument(documentData)
      : await createDocument(documentData);
    return json({ ok: true });
  } catch (e) {
    if (!(e instanceof ZodError)) {
      console.error(e);
      return badRequest({
        error: 'We dont know what happened'
      });
    }
    console.log(e);

    const errors: { [key: string]: string | undefined } = {};

    for (const error of (e as ZodError).errors) {
      errors[error.path[0]] = error.message;
    }

    return badRequest({ errors, hash: parseInt(hash) });
  }
};
