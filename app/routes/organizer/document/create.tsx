import type { ActionFunction } from 'remix';
import { json } from 'remix';

import { z, ZodError } from 'zod';

import { requireAdminUser } from '~/server/auth/session.server';
import { createDocument, updateDocument } from '~/server/documents.server';
import i18n from '~/server/i18n.server';
import type { CreateDocumentInput } from '~/types';
import { badRequest } from '~/utils/misc';

const RESOURCES_NS = 'create-event-form';

export const action: ActionFunction = async ({ request }) => {
  await requireAdminUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);
  const form = await request.formData();

  const name = form.get('name') as string;
  const eventId = form.get('eventId') as string;
  const documentId = form.get('documentId') as string;

  //TODO: change "key" value
  const documentData: CreateDocumentInput = {
    id: documentId,
    label: name,
    key: 'delete',
    eventId
  };

  const DocumentSchema = z.object({
    label: z.string().min(5, { message: t('Min 5 chars') })
  });

  try {
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

    return badRequest({ errors });
  }
};
