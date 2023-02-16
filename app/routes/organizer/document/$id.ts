import type { LoaderFunction } from '@remix-run/node';
import { Status } from '@prisma/client';

import { requireAdminUser, requireUser } from '~/server/auth/session.server';
import { downloadFromS3 } from '~/server/utils/s3';
import { findDocument } from '~/server/documents.server';
import i18n from '~/server/i18n.server';

import { findEvent } from '~/server/db/events.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';

const RESOURCES_NS = 'create-event-form';

export const loader: LoaderFunction = async ({ request, params }) => {
  // hide while this is still in dev
  await requireAdminUser(request);
  const user = await requireUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const documentId = params.id as string;
  const document = await findDocument(documentId);

  if (!document) {
    throw NotFound(t('No Document'));
  }

  const event = await findEvent(document.eventId);

  if (!event) {
    throw NotFound(t('Event not found'));
  }
  if (event.status !== Status.published && event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  const body = await downloadFromS3(document.path);

  //@ts-ignore
  return new Response(body, {
    headers: {
      'content-disposition': `inline; filename="${document.label}.gpx"`
    }
  });
};
