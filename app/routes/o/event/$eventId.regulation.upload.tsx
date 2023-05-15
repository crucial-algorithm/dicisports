import { Readable } from 'stream';

import * as React from 'react';

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
import { badRequest } from '~/utils/misc';
import { uploadToS3 } from '~/server/utils/s3';
import { findEvent, updateEventRegulation } from '~/server/db/events.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request, params }) => {
  const user = await requireUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, data, filename }) => {
      console.log('data -->', name, filename);
      if (name !== 'file') {
        return undefined;
      }

      if (filename === undefined || filename.length === 0) {
        return undefined;
      }

      const eventId = params.eventId as string;
      const path = require('path');
      const fileExtension = path.parse(filename as string).ext;
      const currentDate = new Date();
      const prefix = `events/${currentDate.getFullYear()}${currentDate.getMonth()}/${eventId}`;

      return await uploadToS3(
        Readable.from(data),
        prefix,
        t('Regulation') + fileExtension
      );
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  const form = await unstable_parseMultipartFormData(request, uploadHandler);

  const eventId = params.eventId as string;
  const file = (form.get('file') as string) || null;

  const path = file && file?.length > 0 ? file : null;
  const event = await findEvent(eventId);

  const regulationData: {
    eventId: string;
    regulationPath: string | null;
    regulationContent: null;
  } = {
    eventId,
    regulationPath: path,
    regulationContent: null
  };

  if (!event) {
    throw NotFound(t('Event not found'));
  }
  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

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
