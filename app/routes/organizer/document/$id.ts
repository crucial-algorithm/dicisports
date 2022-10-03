import type { LoaderFunction } from 'remix';

import { requireAdminUser } from '~/server/auth/session.server';
import { downloadFromS3 } from '~/server/utils/s3';
import { findDocument } from '~/server/documents.server';
import i18n from '~/server/i18n.server';

const RESOURCES_NS = 'create-event-form';

export const loader: LoaderFunction = async ({ request, params }) => {
  // hide while this is still in dev
  await requireAdminUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const documentId = params.id as string;
  const document = await findDocument(documentId);

  if (!document) {
    throw new Response(t('No Document'), {
      status: 404
    });
  }

  return downloadFromS3(document.path);
};
