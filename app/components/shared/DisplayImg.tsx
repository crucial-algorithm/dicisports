import { buildImageUrl } from 'cloudinary-build-url'
import React from 'react'
import clsx from 'clsx'

type DisplayImgProps = {
  id: string | null
  dontMessWithImgSize?: boolean
  transformations?: object
} & React.ComponentProps<'img'>

export default function DisplayImg({
  alt,
  id,
  className,
  dontMessWithImgSize,
  transformations = {}
}: DisplayImgProps) {
  return (
    <img
      alt={alt}
      className={clsx(
        {
          'w-full lg:w-144 lg:max-h-144': !dontMessWithImgSize
        },
        'rounded-lg object-cover object-top',
        className
      )}
      src={buildImageUrl(id, { transformations })}
    />
  )
}
