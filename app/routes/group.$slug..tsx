import React from 'react';
import type { LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import { useTranslation } from 'react-i18next';
import type { TransformerOption } from '@cld-apis/types';

import { useLoaderData } from '@remix-run/react';

import { findGroupBySlug } from '~/server/db/groups.server';
import type { Group } from '~/types';
import { H2, Paragraph } from '~/components/shared/typography';
import Main from '~/components/shared/Main';

import DisplayImg from '~/components/shared/DisplayImg';
import { displayTimeOfDay } from '~/utils/misc';

export const handle = {
  i18n: ['m-groups', 'common']
};

type LoaderData = {
  group: Group
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const slug = params.slug as string;

  if (!slug) {
    redirect('/');
  }
  return json({
    group: await findGroupBySlug(slug)
  });
};

export default function GroupDisplayRoute() {
  const { group } = useLoaderData<LoaderData>() as LoaderData;
  const { t } = useTranslation('m-groups');
  const { t: tc } = useTranslation('common');
  const transformations: TransformerOption = {
    resize: {
      type: 'fill',
      width: 400,
      height: 400
    }
  };
  const day = tc(
    [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ][group.dayOfWeek]
  );

  return (
    <Main>
      <H2 className="text-sp-light-blue-900 mb-4">
        <b>{group.name}</b>
        <small>
          {t('Single Group Title Organizer')} {group.createdBy?.name},
          <span className="lowercase"> {day}</span> {t('Single Group Title At')}{' '}
          {displayTimeOfDay(group.timeOfDay)}
        </small>
      </H2>

      <div className="w-full m-auto flex flex-row justify-begin gap-4 md:w-full md:grid-flow-col md:grid-rows-1">
        {group.image1 ? (
          <DisplayImg id={group.image1} transformations={transformations} />
        ) : null}
        {group.image2 ? (
          <DisplayImg id={group.image2} transformations={transformations} />
        ) : null}
        {group.image3 ? (
          <DisplayImg id={group.image3} transformations={transformations} />
        ) : null}
      </div>

      <Paragraph className="mt-8">
        {t('Single Group Where')} {group.near}{' '}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${group.lat}%2C${group.lng}`}
          className="text-primary lowercase underlined hover:text-team-current whitespace-nowrap text-lg font-medium focus:outline-none"
          target="_blank"
          rel="noreferrer"
        >
          ({t('Single Group View Map')})
        </a>
      </Paragraph>
    </Main>
  );
}
