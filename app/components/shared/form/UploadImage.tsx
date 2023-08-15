import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';
import { buildImageUrl } from 'cloudinary-build-url';

type UploadImageProps = {
  index: number
  label: string
  defaultValue?: string | undefined | null
  disabled: boolean
} & Omit<React.ComponentProps<'section'>, 'defaultValue' | 'onDrop'>

// Hack from https://stackoverflow.com/questions/52078853/is-it-possible-to-update-filelist
// to get react-dropzone to populate the file when dropping an image
function FileListItems(files: File[]) {
  const dt = new ClipboardEvent('').clipboardData || new DataTransfer();

  for (let i = 0, len = files.length; i < len; i++) {
    dt.items.add(files[i]);
  }
  return dt.files;
}

export default function UploadImage({
  index,
  label,
  className,
  defaultValue = null,
  disabled = false
}: UploadImageProps) {
  const [thumb, setThumb] = useState<string | null>(
    defaultValue
      ? buildImageUrl(defaultValue, {
          transformations: {
            resize: {
              type: 'fill',
              width: 400
            }
          }
        })
      : null
  );
  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: 'image/*',
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

      setThumb(URL.createObjectURL(file));
    }
  });
  const inputProps = getInputProps();
  const inputFileName = `/file/image/${index}`;
  // @ts-ignore
  const inputEl = inputProps.ref;

  return (
    <section
      className={clsx(
        'h-80 bg-gray-100 text-black placeholder-gray-500 text-lg font-medium',
        'dark:disabled:text-blueGray-500 dark:text-white dark:bg-gray-800',
        'object-cover object-left-top overflow-hidden',
        'flex content-center justify-center',
        className
      )}
    >
      <div {...getRootProps({ className: 'h-80 w-full overflow-hidden' })}>
        <input {...inputProps} name={inputFileName} ref={inputEl} disabled={disabled} />
        {thumb ? (
          <img src={thumb} alt="" className="object-cover object-left-top" />
        ) : (
          <p className="h-80 w-full flex items-center justify-center">{label}</p>
        )}
      </div>
    </section>
  );
}
