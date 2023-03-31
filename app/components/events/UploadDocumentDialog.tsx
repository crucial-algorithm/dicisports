import { useFetcher } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import Button from '~/components/shared/Button';
import Dialog from '~/components/shared/Dialog';
import FormField from '~/components/shared/form/FormField';
import TextField from '~/components/shared/form/TextField';
import type { Document } from '~/types';

const RESOURCES_NS = 'create-event-form';

type FormErrors = {
  label?: string;
  path?: string;
};

export default function UploadDocumentDialog(props: {
  isOpen: boolean;
  onDismiss: () => void;
  document?: Document;
  eventId: string;
  hash: number;
}) {
  const { isOpen, onDismiss, eventId, document, hash } = props;
  const { t } = useTranslation(RESOURCES_NS);
  const fetcher = useFetcher();
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadedDocument, setUploadedDocument] = useState<string | null>(null);
  const name = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setErrors({});
    onDismiss();
    setUploadedDocument(null);
  }, [onDismiss]);

  function handleSubmit() {
    const payload = {
      name: name.current?.value || '',
      documentId: document?.id ? document.id : '',
      hash: String(hash)
    };

    if (!document?.id) {
      // @ts-ignore
      payload['file'] = inputEl.current?.files[0];
    }

    fetcher.submit(payload, {
      method: 'post',
      action: `/o/document/${eventId}/manage`,
      encType: 'multipart/form-data'
    });
  }

  function FileListItems(files: File[]) {
    const dt = new ClipboardEvent('').clipboardData || new DataTransfer();

    for (let i = 0, len = files.length; i < len; i++) {
      dt.items.add(files[i]);
    }

    return dt.files;
  }

  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: '.pdf, .gpx',
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

  useEffect(() => {
    if (fetcher.type === 'actionReload' && fetcher.data.ok) {
      return close();
    }

    if (
      fetcher.type === 'done' &&
      fetcher.data?.errors &&
      fetcher.data?.hash === hash
    ) {
      return setErrors(fetcher.data.errors as FormErrors);
    }
  }, [close, fetcher, hash]);

  return (
    <Dialog
      className="md:w-8/12"
      isOpen={isOpen}
      onClose={close}
      title={document?.id ? t('Update Document') : t('Upload Document')}
      PrimaryAction={
        <Button
          type="button"
          onClick={handleSubmit}
          name="create-document-button"
        >
          {document?.id
            ? t('Update Document Button')
            : t('Upload Document Button')}
        </Button>
      }
      SecondaryAction={
        <Button type="button" variant="secondary" onClick={close}>
          {t('Cancel')}
        </Button>
      }
    >
      <div className="p-4" key={hash}>
        <FormField label={t('Name')} error={errors?.label}>
          <TextField
            name="document-name"
            placeholder={t('Document Name')}
            defaultValue={document?.label ? document.label : ''}
            className="max-w-md"
            input={name}
          />
        </FormField>
        {!document && (
          <FormField label={t('Document')} error={errors?.path}>
            <section
              className={clsx(
                'h-40 bg-gray-100 text-black placeholder-gray-500 text-lg font-medium',
                'dark:disabled:text-blueGray-500 dark:text-white dark:bg-gray-800',
                'object-cover object-left-top overflow-hidden',
                'flex content-center justify-center'
              )}
            >
              <div
                {...getRootProps({
                  className: 'h-80 w-full overflow-hidden'
                })}
              >
                <input {...inputProps} name="/file/misc/" ref={inputEl} />
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
          >
            {uploadedDocument}
          </div>
        )}
      </div>
    </Dialog>
  );
}
