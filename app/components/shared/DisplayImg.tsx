import { buildImageUrl } from 'cloudinary-build-url'
import React from 'react'

type DisplayImgProps = {
  id: string | null
} & React.ComponentProps<'img'>

export default function DisplayImg({ alt, id }: DisplayImgProps) {
  return (
    <img
      alt={alt}
      className="w-full rounded-lg object-cover"
      src={buildImageUrl(id, {})}
    />
  )
}
