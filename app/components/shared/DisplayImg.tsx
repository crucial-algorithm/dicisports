import { buildImageUrl } from 'cloudinary-build-url'
import React from 'react'
import clsx from 'clsx'

type DisplayImgProps = {
  id: string | null
  dontMessWithImgSize?: boolean
} & React.ComponentProps<'img'>

export default function DisplayImg({
  alt,
  id,
  className,
  dontMessWithImgSize
}: DisplayImgProps) {
  return (
    <img
      alt={alt}
      className={clsx(
        {
          'w-full h-72 md:max-w-sm md:h-72 lg:w-144 lg:max-w-md':
            !dontMessWithImgSize
        },
        'rounded-lg object-cover object-left-top',
        className
      )}
      src={buildImageUrl(id, {})}
    />
  )
}
