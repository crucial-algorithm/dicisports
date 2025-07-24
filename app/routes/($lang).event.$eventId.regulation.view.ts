import type { LoaderFunction } from '@remix-run/node';
import { Status } from '@prisma/client';

import { getUser } from '~/server/auth/session.server';
import { downloadFromS3 } from '~/server/utils/s3';
import i18n from '~/server/i18n.server';

import { findEvent } from '~/server/db/events.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';

const RESOURCES_NS = 'create-event-form';

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUser(request);
  const eventId = params.eventId as string;

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const event = await findEvent(eventId);

  if (!event) {
    throw NotFound(t('Event not found'));
  }

  if (event.status !== Status.published && event.createdById !== user?.id) {
    throw Unauthorized(t('Not authorized'));
  }

  const body = await downloadFromS3(event.regulationPath as string);

  //@ts-ignore
  return new Response(body, {
    headers: {
      'content-disposition': `attachment; filename="${event.regulationFileName}"`
    }
  });
};
