import type { LoaderFunction } from 'remix';

import { requireAdminUser } from '~/server/auth/session.server';
import { downloadFromS3 } from '~/server/utils/s3';
import { findDocument } from '~/server/documents.server';

export const loader: LoaderFunction = async ({ request, params }) => {
  // hide while this is still in dev
  await requireAdminUser(request);
  const documentId = params.id as string;
  const document = await findDocument(documentId);

  if (!document) {
    //TODO: Change to badRequest and catch error
    return null;
  }

  return downloadFromS3(document.key);
};
