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
  customUpload: boolean;
  mode: 'basic' | 'advanced' | undefined;
  chooseLabel: string;
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
  mode,
  chooseLabel,
  accept,
  customUpload,
  uploadHandler,
  emptyTemplate,
  contentClassName,
  className
}: Props) {
  const { t } = useTranslation('create-event-form');

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
      mode={mode}
      accept={accept}
      customUpload={customUpload}
      uploadHandler={uploadHandler}
      emptyTemplate={emptyTemplate}
      contentClassName={contentClassName}
      className={className}
      chooseLabel={chooseLabel}
      itemTemplate={itemTemplate}
      auto={true}
    />
  );
}
