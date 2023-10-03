import { Galleria as PrimeGalleria } from 'primereact/galleria';
import * as React from 'react';
import { forwardRef } from 'react';

import DisplayImg from '~/components/shared/DisplayImg';

type Props = {
  values: Array<string>;
};


const EventGalleria = forwardRef<PrimeGalleria, Props>(function Galleria(
  { values },
  ref
) {
  function itemTemplate(id: string) {
    return <DisplayImg imageId={id} variant="View" dontMessWithImgSize={true} /> ;
  }

  return (
    <PrimeGalleria
      ref={ref}
      item={itemTemplate}
      showThumbnails={false}
      fullScreen
      showItemNavigators
      value={values}
    />
  );
});

export default EventGalleria;
