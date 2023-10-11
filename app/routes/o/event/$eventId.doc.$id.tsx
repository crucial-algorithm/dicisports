import { Readable } from 'stream';

import * as React from 'react';
import { useRef, useState } from 'react';

import { useActionData, useLoaderData } from '@remix-run/react';

import clsx from 'clsx';

import type { ActionFunction, LoaderFunction, UploadHandler } from '@remix-run/node';
import {
  json,
  redirect,
  unstable_composeUploadHandlers,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData
} from '@remix-run/node';
import { useDropzone } from 'react-dropzone';

import { useTranslation } from 'react-i18next';

import { z, ZodError } from 'zod';

import type { Event } from '@prisma/client';

import Button, { ButtonLink } from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';

import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import UploadForm from '~/components/shared/form/UploadForm';
import Main from '~/components/shared/Main';

import { requireUser } from '~/server/auth/session.server';
import { createDocument, findDocument, updateDocument } from '~/server/documents.server';
import i18n from '~/server/i18n.server';
import type { CreateDocumentInput, Document } from '~/types';
import { badRequest, fileTypeFromUploadHandlerData } from '~/utils/misc';
import { uploadToS3 } from '~/server/utils/s3';
import Id from '~/server/utils/Id.server';
import { findEvent } from '~/server/db/events.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';

const RESOURCES_NS = 'create-event-form';

type LoaderData = {
  event: Event;
  document: Document | null;
};

type ActionData = {
  errors?: FormErrors
}

type FormErrors = {
  label?: string;
  path?: string;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const eventId = params.eventId as string;
  const documentId = params.id as string;
  const t = await i18n.getFixedT(request, RESOURCES_NS);

  if (!eventId || !documentId) {
    return redirect('/o');
  }

  const event = await findEvent(eventId);

  if (!event) {
    throw NotFound(t('Event not found'));
  }

  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  const document = documentId === 'new' ? null : await findDocument(documentId);

  if (document && document.eventId !== eventId) {
    // weird - just in case, verify consistency in route
    throw NotFound(t('Race not found'));
  }

  return json({
    event,
    document
  });
};

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

      if (filename === undefined) {
        return undefined;
      }

      const fileType = await fileTypeFromUploadHandlerData(data);
      const isValidType = fileType && (fileType === 'pdf' || fileType === 'gpx');

      if (!isValidType) {
        return 'invalid-type';
      }

      const prefix = `events/${event.createdAt.getFullYear()}${String(event.createdAt.getMonth() + 1).padStart(2, '0')}/${eventId}`;
      const key = await uploadToS3(
        Readable.from(data),
        prefix,
        `${Id()}.${fileType}`
      );

      return `${key}|${filename}|${fileType}`;
    },
    // fallback to memory for everything else
    unstable_createMemoryUploadHandler()
  );

  const form = await unstable_parseMultipartFormData(request, uploadHandler);

  const name = form.get('name') as string;
  const documentId = params.id === 'new' ? null : params.id;
  const file =
    form.get('file') === 'undefined' || form.get('file') === null
      ? undefined
      : form.get('file') as string;
  const isFileTypeValid = file && file !== 'invalid-type';
  let filePath: File | string | null = null;
  let fileName: string = '';
  let fileType: string = '';

  if (file && file?.length) {
    if (file !== 'invalid-type') {
      [filePath, fileName, fileType] = file.split('|');
    }
  }

  const isInsert = !documentId;
  const documentData: CreateDocumentInput = {
    id: isInsert ? Id() : documentId as string,
    label: name,
    // @ts-ignore
    path: filePath,
    fileName,
    type: fileType,
    eventId
  };

  const DocumentSchema = z.object({
    label: z.string().min(5, { message: t('Min 5 chars') }),
    path: z
      .string({ invalid_type_error: t(isFileTypeValid ? 'Select a document' : 'Invalid File Type') })
      .refine(
        () => {
          if (!isInsert) {
            return true;
          }

          return documentData.path !== undefined;
        },
        {
          message: t(isFileTypeValid ? 'Select a document' : 'Invalid File Type')
        }
      )
  });

  try {

    //If actionId is null or !== 'delete' check if there is a document and update or create
    DocumentSchema.parse(documentData);
    isInsert
      ? await createDocument(documentData)
      : await updateDocument(documentData);

    return redirect(`/o/event/${event.id}#documents`);
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


export default function EventDocumentRoute() {
  const { event, document } = useLoaderData() as LoaderData;
  const actionData = useActionData() as ActionData;

  const { t } = useTranslation(RESOURCES_NS);
  const [uploadedDocument, setUploadedDocument] = useState<string | null>(null);
  const name = useRef<HTMLInputElement>(null);


  function FileListItems(files: File[]) {
    const dt = new ClipboardEvent('').clipboardData || new DataTransfer();

    for (let i = 0, len = files.length; i < len; i++) {
      dt.items.add(files[i]);
    }

    return dt.files;
  }

  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    onDrop: (accepted) => {
      if (accepted.length === 0) {
        return;
      }
      const file: File = accepted[0] as File;

      if (!inputEl || !inputEl.current) {
        return;
      }

      // @ts-ignore
      inputEl.current.files = new FileListItems([file]);
      setUploadedDocument(file.name);
    }
  });
  const inputProps = getInputProps();
  // @ts-ignore
  const inputEl = inputProps.ref;

  return (
    <Main>
      <UploadForm>
        <div className="p-4">
          <div className="flex justify-end">
            <ButtonLink
              to={`/o/event/${event.id}`}
              className="flex md:hidden mb-2"
              variant="secondary"
            >
              {t('Back Button')}
            </ButtonLink>
          </div>
          <div className="flex flex-row justify-between items-center">
            <FormField label={t('Name')} error={actionData?.errors?.label}>
              <TextField
                name="name"
                placeholder={t('Document Name')}
                defaultValue={document?.label ? document.label : ''}
                className="max-w-md"
                input={name}
              />
            </FormField>
            <>
              <ButtonLink
                to={`/o/event/${event.id}`}
                className="hidden md:flex"
                variant="secondary"
              >
                {t('Back Button')}
              </ButtonLink>
            </>
          </div>
          {!document && (
            <FormField label={t('Document')} error={actionData?.errors?.path} description={t('Only PDF and GPX')}>
              <section
                className={clsx(
                  'h-40 bg-gray-100 text-black placeholder-gray-500 text-lg font-medium',
                  'dark:disabled:text-blueGray-500 dark:text-white dark:bg-gray-800',
                  'object-cover object-left-top overflow-hidden',
                  'flex content-center justify-center cursor-pointer'
                )}
              >
                <div
                  {...getRootProps({
                    className: 'h-80 w-full overflow-hidden'
                  })}
                >
                  <input {...inputProps} name="file" ref={inputEl} />
                  <p className="h-40 w-full flex items-center justify-center">
                    {t('Document Dropzone')}
                  </p>
                </div>
              </section>
            </FormField>
          )}
          {uploadedDocument && (
            <div
              className={clsx(
                'text-md font-extrabold dark:text-white my-4 ml-4'
              )}
              data-cy="uploaded-document"
            >
              {uploadedDocument}
            </div>
          )}
        </div>
        <ButtonGroup>
          <ButtonLink
            variant="secondary"
            type="submit"
            to={`/o/event/${event.id}#documents`}
          >
            {t('Cancel')}
          </ButtonLink>
          <Button type="submit" name="create-document-button">
            {document?.id
              ? t('Update Document Button')
              : t('Upload Document Button')}
          </Button>
        </ButtonGroup>
      </UploadForm>
    </Main>
  );
}
