import React, { useState } from 'react'
import { useDropzone } from 'react-dropzone'

export type UploadImageProps = {
  name: string
  label: string
  containerClass?: string
  onDrop?: (name: string, file: File) => void
}

export default function UploadImage({
  name,
  label,
  containerClass = 'images-container',
  onDrop = () => true
}: UploadImageProps) {
  const [thumb, setThumb] = useState<string | null>(null)
  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    accept: 'image/*',
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) return
      const file: File = acceptedFiles[0] as File
      setThumb(URL.createObjectURL(file))
      onDrop(name, file)
    }
  })

  return (
    <section className={containerClass}>
      <div {...getRootProps({ className: 'dropzone' })}>
        <input {...getInputProps()} name={name} />
        {thumb ? <img src={thumb} alt="" /> : <p>{label}</p>}
      </div>
    </section>
  )
}
