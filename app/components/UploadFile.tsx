import type { FileUploadHandlerEvent } from 'primereact/fileupload';
import { FileUpload } from 'primereact/fileupload';
import type { ReactElement } from 'react';
import React from 'react';

type Props = {
  customUpload: boolean;
  uploadHandler: (f: FileUploadHandlerEvent) => void;
  mode: 'basic' | 'advanced' | undefined;
  emptyTemplate?: ReactElement;
  contentClassName?: string;
  className?: string;
} & React.ComponentProps<'input'>;

export default function UploadFile({
  name,
  mode,
  accept,
  customUpload,
  uploadHandler,
  emptyTemplate,
  contentClassName,
  className
}: Props) {
  return (
    <FileUpload
      name={name}
      mode={mode}
      accept={accept}
      customUpload={customUpload}
      uploadHandler={uploadHandler}
      emptyTemplate={emptyTemplate}
      contentClassName={contentClassName}
      className={className}
      auto={true}
    />
  );
}
