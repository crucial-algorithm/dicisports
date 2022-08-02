import { buildImageUrl } from 'cloudinary-build-url';
import React from 'react';
import clsx from 'clsx';
import type { TransformerOption } from '@cld-apis/types';

type DisplayImgProps = {
  id: string | null
  dontMessWithImgSize?: boolean
  transformations?: TransformerOption
  variant?: 'List' | 'View' | 'Grid'
} & React.ComponentProps<'img'>

export default function DisplayImg({
  alt,
  id,
  className,
  dontMessWithImgSize,
  transformations = {},
  variant = 'List'
}: DisplayImgProps) {

  let widths: number[];
  let sizes: string[];

  widths = [280, 400, 500];
  sizes = [
    '(max-width:639px) 500px',
    '(min-width:640px) and (max-width:1023px) 280px',
    '(min-width:1024px) and (max-width:1620px) 400px',
    '400px'
  ];

  if (variant === 'View') {
    widths = [280, 560, 840];
    sizes = [
      '(max-width:1023px) 80vw',
      '(min-width:1024px) and (max-width:1620px) 67vw',
      '1100px'
    ];
  }

  if (variant === 'Grid') {
    widths = [180, 224, 560];
    sizes = [
      '(max-width:1023px) 180px',
      '(min-width:1024px) and (max-width:1620px) 224px',
      '560px'
    ];
  }

  return (
    <img
      className={clsx(
        {
          'w-full lg:w-144 lg:max-h-144': !dontMessWithImgSize
        },
        'rounded-lg object-cover object-top',
        className
      )}
      {...getImgProps(getImageBuilder(id, alt), {
        transformations,
        widths,
        sizes
      })}
    />
  );
}

type ImageBuilder = {
  (transformations?: TransformerOption): string
  alt: string
  id: string
}

function getImageBuilder(id: string, alt: string = ''): ImageBuilder {
  function imageBuilder(transformations?: TransformerOption) {
    return buildImageUrl(id, { transformations });
  }

  imageBuilder.alt = alt;
  imageBuilder.id = id;
  return imageBuilder;
}

function getImgProps(
  imageBuilder: ImageBuilder,
  {
    widths,
    sizes,
    transformations
  }: {
    widths: Array<number>;
    sizes: Array<string>;
    transformations?: TransformerOption;
  }
) {
  const averageSize = Math.ceil(widths.reduce((a, s) => a + s) / widths.length);

  return {
    alt: imageBuilder.alt,
    src: imageBuilder({
      quality: 'auto',
      format: 'auto',
      ...transformations,
      resize: { width: averageSize, ...transformations?.resize }
    }),
    srcSet: widths
      .map((width) =>
        [
          imageBuilder({
            quality: 'auto',
            format: 'auto',
            ...transformations,
            resize: { width, ...transformations?.resize }
          }),
          `${width}w`
        ].join(' ')
      )
      .join(', '),
    sizes: sizes.join(', ')
  };
}

export { getImgProps };
