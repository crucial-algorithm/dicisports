import clsx from 'clsx';
import React from 'react';

import { Carousel as ResponsiveCarousel } from 'react-responsive-carousel';

import DisplayImg from '~/components/shared/DisplayImg';

type Props = {
  images: Array<string>;
  imagesClassName?: string;
  onClick?: () => void;
  onChange?: (position: number) => void;
} & Omit<React.ComponentProps<'div'>, 'onClick' | 'onChange'>;

function cleanStatus() {
  return '';
}

export default function Carousel({
  images,
  imagesClassName,
  onClick,
  onChange
}: Props) {
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

  function handleStopPropagation(e: React.MouseEvent) {
    // @ts-ignore
    const tag = e.target.tagName;

    // don't do anything else other than swap between images if user clicks in
    // one of the carousel buttons
    if (tag === 'BUTTON') {
      return e.stopPropagation();
    }

    onClick && onClick();
  }

  return (
    <div onClick={handleStopPropagation}>
      <ResponsiveCarousel
        statusFormatter={cleanStatus}
        showThumbs={false}
        showIndicators={true}
        renderIndicator={numberOfImagesIndicator}
        onChange={onChange}
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
