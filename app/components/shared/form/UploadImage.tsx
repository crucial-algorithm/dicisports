import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import clsx from 'clsx'
import { buildImageUrl } from 'cloudinary-build-url'

type UploadImageProps = {
  index: number
  imageId?: string
  label: string
  onDrop?: (index: number, file: File) => void
  defaultValue?: string | undefined | null
} & Omit<React.ComponentProps<'section'>, 'defaultValue' | 'onDrop'>

export default function UploadImage({
  index,
  imageId,
  label,
  className,
  onDrop = () => true,
  defaultValue = null
}: UploadImageProps) {
  const [thumb, setThumb] = useState<string | null>(
    defaultValue ? buildImageUrl(defaultValue, {}) : null
  )
  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: 'image/*',
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) return
      const file: File = acceptedFiles[0] as File
      setThumb(URL.createObjectURL(file))
      setValue(imageId)
      onDrop(index, file)
    }
  })

  const [value, setValue] = useState<string | undefined>('')
  const inputFileName = `/image/${index}/file`
  const inputShadowName = `/image/${index}`

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
        <input {...getInputProps()} name={inputFileName} />
        {thumb ? (
          <img src={thumb} alt="" className="object-cover object-left-top" />
        ) : (
          <p className="h-80 w-full flex items-center justify-center">{label}</p>
        )}
      </div>
      <input type="hidden" name={inputShadowName} value={value} />
    </section>
  )
}
