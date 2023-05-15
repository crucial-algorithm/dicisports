import { FileUpload } from 'primereact/fileupload';
import type { ReactElement } from 'react';
import React from 'react';

type Props = {
  filePath: string | null;
  fileName?: string | null;
  deleteButton?: ReactElement;
} & React.ComponentProps<'FileUpload'>;

export default function UploadFile({
  name,
  filePath = null,
  fileName = null,
  deleteButton,
  mode,
  accept,
  customUpload,
  uploadHandler
}: Props) {
  return (
    <>
      {!filePath ? (
        <FileUpload
          name={name}
          mode={mode}
          accept={accept}
          customUpload={customUpload}
          uploadHandler={uploadHandler}
        />
      ) : (
        <div>
          <div className="flex flex-row gap-x-2 items-center border border-black dark:border-white rounded-2xl h-16 p-4 mr-2 mb-2">
            <a
              href={filePath}
              target="_blank"
              rel="noreferrer"
              className="text-black dark:text-white"
              data-cy="regulation"
            >
              {fileName}
            </a>
            {deleteButton}
          </div>
        </div>
      )}
    </>
  );
}
