import * as path from 'path';
import { Readable } from 'stream';

import type { ActionFunction, UploadHandler } from '@remix-run/node';
import {
  json,
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from '@remix-run/node';

import { z, ZodError } from 'zod';

import { requireUser } from '~/server/auth/session.server';
import i18n from '~/server/i18n.server';
import { badRequest, fileExtensionFromMimeType } from '~/utils/misc';
import { uploadToS3 } from '~/server/utils/s3';
import { findEvent, updateEventRegulation } from '~/server/db/events.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';

export const handle = {
  i18n: ['create-event-form']
};

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const eventId = params.eventId as string;
  const event = await findEvent(eventId);

  if (!event) {
    throw NotFound(t('Event not found'));
  }

  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, data, filename, contentType }) => {
      if (name !== 'file') {
        return undefined;
      }

      if (filename === undefined || filename.length === 0) {
        return undefined;
      }

      const fileType = fileExtensionFromMimeType(contentType);

      if (!fileType) {
        return undefined;
      }

      const prefix = `events/${event.createdAt.getFullYear()}${String(event.createdAt.getMonth() + 1).padStart(2, '0')}/${eventId}`;
      const key = await uploadToS3(
        Readable.from(data),
        prefix,
        'regulation' + fileType
      );

      return `${key}|${filename}`;
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  const form = await unstable_parseMultipartFormData(request, uploadHandler);

  const file = (form.get('file') as string) || null;
  let filePath: File | string | null = null;
  let fileName: string | null = null;

  if (file && file?.length) {
    [filePath, fileName] = file.split('|');
  }

  const regulationData: {
    eventId: string;
    regulationPath: string | null;
    regulationFileName: string | null;
    regulationContent: null;
  } = {
    eventId,
    regulationPath: filePath,
    regulationFileName: fileName,
    regulationContent: null
  };

  // @ts-ignore
  const RegulationSchema = z.object({
    regulationPath: z.string().refine(
      () => {
        return regulationData.regulationPath !== undefined;
      },
      {
        message: t('Select a document')
      }
    )
  });

  try {
    RegulationSchema.parse(regulationData);

    await updateEventRegulation(regulationData);

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

    return badRequest({ errors });
  }
};
