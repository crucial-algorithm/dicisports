import { Link } from '@remix-run/react';
import type { TFunction } from 'i18next';
import * as React from 'react';

import DisplayImg from '~/components/shared/DisplayImg';
import type { Language, Sport } from '~/types';
import { getLocalizedText } from '~/utils/misc';

export default function SportsGrid({
  sports,
  lang,
  t
}: {
  sports: Sport[];
  lang: Language;
  t: TFunction;
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
      {new Array(8 - sports.length).fill(null).map((a, i) => (
        <a
          href={`mailto:feedback@dicisports.com?subject=${t(
            'Add Sport Mail Subject'
          )}`}
          key={i}
        >
          <DisplayImg
            imageId={'product/sports/add-sport_xe6eok'}
            key={i}
            alt={t('Add Sport')}
            className={width}
            dontMessWithImgSize={true}
            variant="Grid"
          />
        </a>
      ))}
    </div>
  );
}
