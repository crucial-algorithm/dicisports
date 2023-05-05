import type { LoaderFunction } from '@remix-run/node';
import { Status } from '@prisma/client';

import { getUser } from '~/server/auth/session.server';
import { downloadFromS3 } from '~/server/utils/s3';
import { findDocument } from '~/server/documents.server';
import i18n from '~/server/i18n.server';

import { findEvent } from '~/server/db/events.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';

const RESOURCES_NS = 'create-event-form';

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const documentId = params.id as string;
  const eventId = params.eventId as string;
  let path: string;
  let label: string;

  const event = await findEvent(eventId);

  if (!event) {
    throw NotFound(t('Event not found'));
  }
  if (event.status !== Status.published && event.createdById !== user?.id) {
    throw Unauthorized(t('Not authorized'));
  }

  if (documentId === 'regulation') {
    label = t('Regulation');
    path = event.regulationPath as string;
  } else {
    const document = await findDocument(documentId);

    if (!document) {
      throw NotFound(t('No Document'));
    }

    label = document.label as string;
    path = document.path as string;
  }

  const body = await downloadFromS3(path);

  //@ts-ignore
  return new Response(body, {
    headers: {
      'content-disposition': `inline; filename="${label}.gpx"`
    }
  });
};
