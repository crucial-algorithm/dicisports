import type {
  FileUploadHandlerEvent,
  FileUploadProps,
  ItemTemplateOptions
} from 'primereact/fileupload';
import { FileUpload } from 'primereact/fileupload';
import type { ReactElement } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  uploadButtonLabel: string;
  emptyDropZoneLabel: string;
  uploadHandler?: (f: FileUploadHandlerEvent) => void;
  emptyTemplate?: ReactElement;
  contentClassName?: string;
  className?: string;
} & React.ComponentProps<'input'>;

export const handle = {
  i18n: ['create-event-form']
};

export default function UploadFile({
  name,
  uploadButtonLabel,
  accept,
  uploadHandler,
  emptyDropZoneLabel,
  contentClassName,
  className
}: Props) {
  const { t } = useTranslation('create-event-form');

  const chooseOptions = {
    icon: 'w-0',
    iconOnly: false,
    label: uploadButtonLabel,
    className: 'custom-file-upload'
  };

  function itemTemplate(file: FileUploadProps, options: ItemTemplateOptions) {
    return (
      // Using style to override text align class from prime react component
      <div style={{ textAlign: 'left' }}>
        <div>{file.name}</div>
        <span>{`${options.formatSize}`}</span>
        <span className="p-badge p-component p-badge-warning p-fileupload-file-badge">
          {t('Pending')}
        </span>
      </div>
    );
  }

  return (
    <FileUpload
      id="file"
      name={name}
      mode="advanced"
      accept={accept}
      customUpload={true}
      uploadHandler={uploadHandler}
      emptyTemplate={
        <p className="m-0">{emptyDropZoneLabel}</p>
      }
      contentClassName={contentClassName}
      className={className}
      itemTemplate={itemTemplate}
      auto={true}
      chooseOptions={chooseOptions}
    />
  );
}
