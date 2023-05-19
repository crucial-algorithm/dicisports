import type { FileUploadHandlerEvent } from 'primereact/fileupload';
import { FileUpload } from 'primereact/fileupload';
import type { ReactElement } from 'react';
import React from 'react';

type Props = {
  customUpload: boolean;
  mode: 'basic' | 'advanced' | undefined;
  chooseLabel: string;
  uploadHandler?: (f: FileUploadHandlerEvent) => void;
  emptyTemplate?: ReactElement;
  contentClassName?: string;
  className?: string;
} & React.ComponentProps<'input'>;

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
      auto={true}
    />
  );
}
