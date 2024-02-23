import React, { useRef } from 'react';
import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { useTranslation } from 'react-i18next';
import type { TransformerOption } from '@cld-apis/types';

import { useLoaderData } from '@remix-run/react';

import EventGalleria from '~/components/EventGalleria';

import { findGroupBySlug } from '~/server/db/groups.server';
import { findSports } from '~/server/db/reference.server';
import type { Group, Language } from '~/types';
import { H2, Paragraph } from '~/components/shared/typography';
import Main from '~/components/shared/Main';

import DisplayImg from '~/components/shared/DisplayImg';
import { displayTimeOfDay } from '~/utils/misc';
import { getOpenGraphMeta } from '~/utils/seo';
import type { RootLoaderData } from '~/root';
import { getI18nText } from '~/components/I18nText';

export const handle = {
  i18n: ['m-groups', 'common']
};

type LoaderData = {
  group: Group;
  genericImage: string;
};

export const meta: MetaFunction = ({ data, params, location, parentsData }) => {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { i18n } = useTranslation();
  const root: RootLoaderData = parentsData.root as RootLoaderData;
  const { group } = data as { group: Group };

  if (!group) {
    return {};
  }

  const description = group.description?.slice(0, 160);
  const url = `${root.requestInfo.origin}${root.requestInfo.path}${
    root.requestInfo.path === '/' ? location.search : ''
  }`;
  const name = group.sport
    ? getI18nText(group.sport.name, i18n.language as Language)
    : group.name;

  return {
    viewport: 'width=device-width,initial-scale=1,viewport-fit=cover',
    ...getOpenGraphMeta({
      title: `Dicisports - ${group.name}`,
      url,
      description,
      keywords: `grupo ${name}`
    })
  };
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const slug = params.slug as string;

  if (!slug) {
    redirect('/');
  }

  const group = await findGroupBySlug(slug);
  const sports = await findSports();
  const sport = sports.find((s) => s.id === group?.sport?.id);
  const genericImage = sport?.picture || '';

  return json({
    group,
    genericImage
  });
};

export default function GroupDisplayRoute() {
  const { group, genericImage } = useLoaderData<LoaderData>() as unknown as LoaderData;
  const { t } = useTranslation('m-groups');
  const { t: tc } = useTranslation('common');
  const galleria = useRef(null);
  const transformations: TransformerOption = {
    resize: {
      type: 'fill',
      width: 400,
      height: 400
    }
  };

  if (!group) {
    return (
      <Main>
        <Paragraph data-cy="group-not-found">{t('Group not found')}</Paragraph>
        <a href="/">{t('Group not found action')}</a>
      </Main>
    );
  }

  function translateDay(day: number) {
    return tc(
      [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      ][day]
    );
  }

  const images: string[] = [group.image1, group.image2, group.image3].filter(
    Boolean
  ) as string[];

  const schedule = group?.schedules
    ?.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map(
      ({ dayOfWeek, timeOfDay }) =>
        `${translateDay(dayOfWeek)}, ${displayTimeOfDay(timeOfDay)}`
    )
    .join(' | ');

  function handleOpenGallery(e: React.MouseEvent) {
    // @ts-ignore
    galleria.current?.show();

    e.stopPropagation();
  }

  return (
    <Main>
      <H2 className="text-sp-light-blue-900 mb-4">
        <b>{group.name}</b>
        <small>
          {t('Single Group Title Organizer')} {group.createdBy?.name}
          <p className="text-sm font-medium" data-cy="schedule">
            {schedule}
          </p>
        </small>
      </H2>

      <div className="flex flex-col md:flex-row">
        {group.image1 && (
          <div
            className="relative w-fit m-auto flex flex-row justify-begin cursor-pointer"
            onClick={handleOpenGallery}
          >
            <>
              <DisplayImg
                dataCy="image1"
                imageId={group.image1}
                transformations={transformations}
                dontMessWithImgSize={true}
                className="w-[500px] object-cover object-center"
              />
              <div className="absolute rounded bottom-2 left-0 right-0 m-auto px-2 w-fit bg-gray-500/70 text-white">
                {t('Click for full size image')}
              </div>
            </>
          </div>
        )}

        {!group.image1 && (
          <DisplayImg
            imageId={`product/sports/${genericImage}`}
            alt={group.name || ''}
            variant="List"
          />
        )}

        <EventGalleria values={images} ref={galleria} />

        <div className="w-full md:w-4/6 md:px-4">
          {group.description && (
            <div className="max-w-full text-lg text-secondary mt-2">
              {t('Description')}
              <div data-cy="description">{group.description}</div>
            </div>
          )}

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
        </div>
      </div>
    </Main>
  );
}
