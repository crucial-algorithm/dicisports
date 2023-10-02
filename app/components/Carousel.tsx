import clsx from 'clsx';
import React from 'react';

import { Carousel as ResponsiveCarousel } from 'react-responsive-carousel';

import DisplayImg from '~/components/shared/DisplayImg';

type Props = { images: Array<string>; imagesClassName?: string } & React.ComponentProps<'div'>;

function cleanStatus() {
  return '';
}

export default function Carousel({ images, imagesClassName }: Props) {

  function numberOfImagesIndicator(
    clickHandler: (
      e: React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent
    ) => void,
    isSelected: boolean,
    index: number
  ) {
    return (
      <div className={clsx({ hidden: !isSelected, visible: isSelected })}>
        {index + 1}/{images.length}
      </div>
    );
  }

  function preventNavigation(e: React.MouseEvent) {
    // @ts-ignore
    const tag = e.target.tagName;

    if (tag === 'BUTTON') {
      e.stopPropagation();
    }
  }

  return (
    <div onClick={preventNavigation}>
      <ResponsiveCarousel
        statusFormatter={cleanStatus}
        showThumbs={false}
        showIndicators={true}
        renderIndicator={numberOfImagesIndicator}
      >
        {images.map((image, idx) => (
          <DisplayImg
            key={idx}
            imageId={image}
            className={imagesClassName}
            transformations={{
              resize: {
                type: 'fill',
                width: 400,
                height: 400
              }
            }}
          />
        ))}
      </ResponsiveCarousel>
    </div>
  );
}
