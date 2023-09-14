import { Link } from '@remix-run/react';
import * as React from 'react';

import DisplayImg from '~/components/shared/DisplayImg';
import type { Language, Sport } from '~/types';
import { getLocalizedText } from '~/utils/misc';

export default function SportsGrid({
  sports,
  lang
}: {
  sports: Sport[];
  lang: Language;
}) {
  if (!sports) {
    return null;
  }
  const width = 'w-full md:w-56 lg:w-56 xl:w-56';

  return (
    <div className="w-full m-auto grid grid-flow-row gap-2 md:w-full md:grid-flow-col md:grid-rows-2">
      {sports
        .sort((a, b) => a.id - b.id)
        .map((s) => (
          <Link
            to={`?actionId=search&sport=${s.id}`}
            key={s.id}
            data-cy={s.id}
          >
            <DisplayImg
              imageId={`product/sports/${s.picture}`}
              key={s.id}
              alt={getLocalizedText(lang, s.name)}
              dontMessWithImgSize={true}
              className={width}
              variant="Grid"
            />
          </Link>
        ))}
    </div>
  );
}
