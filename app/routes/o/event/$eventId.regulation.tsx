import { Readable } from 'stream';

import * as React from 'react';
import { useState } from 'react';

import { useActionData, useLoaderData } from '@remix-run/react';

import clsx from 'clsx';

import type {
  ActionFunction,
  LoaderFunction,
  UploadHandler
} from '@remix-run/node';
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

import Button, { ButtonLink } from '~/components/shared/Button';
import ButtonGroup from '~/components/shared/ButtonGroup';

import FormField from '~/components/shared/form/FormField';
import UploadForm from '~/components/shared/form/UploadForm';
import Main from '~/components/shared/Main';

import { requireUser } from '~/server/auth/session.server';
import i18n from '~/server/i18n.server';
import type { Document, Event } from '~/types';
import { badRequest } from '~/utils/misc';
import { uploadToS3 } from '~/server/utils/s3';
import Id from '~/server/utils/Id.server';
import { findEvent, updateEventRegulation } from '~/server/db/events.server';
import { NotFound, Unauthorized } from '~/server/utils/misc';
import TextArea from '~/components/shared/form/TextArea';
import InputError from '~/components/shared/form/InputError';

const RESOURCES_NS = 'create-event-form';

type LoaderData = {
  event: Event;
  regulation: Document | null;
};

type ActionData = {
  errors?: FormErrors;
};

type FormErrors = {
  label?: string;
  path?: string;
  submit?: string;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await requireUser(request);
  const eventId = params.eventId as string;
  const t = await i18n.getFixedT(request, RESOURCES_NS);

  if (!eventId) {
    return redirect('/o');
  }

  const event = await findEvent(eventId);

  if (!event) {
    throw NotFound(t('Event not found'));
  }

  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  return json({
    event
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const user = await requireUser(request);

  const t = await i18n.getFixedT(request, RESOURCES_NS);

  const uploadHandler: UploadHandler = unstable_composeUploadHandlers(
    // our custom upload handler
    async ({ name, data, filename }) => {
      if (name !== 'file') {
        return undefined;
      }

      if (filename === undefined || filename.length === 0) {
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

  const eventId = params.eventId as string;
  const file = form.get('file') as string;

  const path = file && file?.length > 0 ? file : null;
  const regulation = (form.get('regulation') as string) || null;
  const event = await findEvent(eventId);

  const regulationData: {
    eventId: string;
    regulationPath: string | null;
    regulationContent: string | null;
  } = {
    eventId,
    regulationPath: path,
    regulationContent: regulation
  };

  if (!event) {
    throw NotFound(t('Event not found'));
  }
  if (event.createdById !== user.id) {
    throw Unauthorized(t('Not authorized'));
  }

  // @ts-ignore
  const RegulationSchema = z
    .object({
      regulationPath: z
        .string()
        .nullable()
        .refine(
          () => {
            return regulationData.regulationPath !== undefined;
          },
          {
            message: t('Select a document')
          }
        ),
      regulationContent: z
        .string()
        .min(5, { message: t('Too Short') })
        .nullable()
    })
    .refine(
      (s) =>
        (s.regulationContent === null &&
          s.regulationPath &&
          s?.regulationPath?.length > 1) ||
        (s.regulationContent &&
          s?.regulationContent?.length > 5 &&
          s.regulationPath === null),
      {
        message: t('At Least 1'),
        path: ['submit']
      }
    )
    .refine(
      (s) =>
        !(s.regulationPath && s?.regulationPath?.length > 1 && s.regulationContent && s?.regulationContent?.length > 1),
      {
        message: t('Just Choose One'),
        path: ['submit']
      }
    );

  try {
    RegulationSchema.parse(regulationData);

    await updateEventRegulation(regulationData);

    return redirect(`/o/event/${event.id}`);
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
  const { event } = useLoaderData() as LoaderData;
  const actionData = useActionData() as ActionData;
  const regulationExists: boolean =
    !!event.regulationContent || !!event.regulationPath;

  const { t } = useTranslation(RESOURCES_NS);
  const [uploadedDocument, setUploadedDocument] = useState<string | null>(null);

  function FileListItems(files: File[]) {
    const dt = new ClipboardEvent('').clipboardData || new DataTransfer();

    for (let i = 0, len = files.length; i < len; i++) {
      dt.items.add(files[i]);
    }

    return dt.files;
  }

  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: '.pdf',
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
          {!regulationExists && (
            <>
              <FormField
                label={t('Document')}
                error={actionData?.errors?.path}
                className="mt-4"
              >
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
            </>
          )}
          {uploadedDocument && (
            <div
              className={clsx(
                'text-md font-extrabold dark:text-white my-4 ml-4'
              )}
            >
              {uploadedDocument}
            </div>
          )}

          <FormField label={t(regulationExists ? 'Regulation' : 'Or')}>
            <TextArea
              name="regulation"
              className="input-text h-80"
              defaultValue={
                event.regulationContent ? event.regulationContent : ''
              }
            />
          </FormField>

          {actionData?.errors?.submit && (
            <InputError className="mt-4" id="error-message">
              {actionData?.errors?.submit}
            </InputError>
          )}
        </div>
        <ButtonGroup>
          <ButtonLink
            variant="secondary"
            type="submit"
            to={`/o/event/${event.id}`}
          >
            {t('Cancel')}
          </ButtonLink>
          <Button
            type="submit"
            name="create-document-button"
            id="submit-button"
          >
            {regulationExists
              ? t('Update Document Button')
              : t('Upload Document Button')}
          </Button>
        </ButtonGroup>
      </UploadForm>
    </Main>
  );
}
