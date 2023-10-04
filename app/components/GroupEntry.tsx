import { useNavigate } from '@remix-run/react';
import type { ReactNode } from 'react';
import React from 'react';

import { useTranslation } from 'react-i18next';

import type { Group, TranslationObject } from '~/types';
import I18nText from '~/components/I18nText';
import Carousel from '~/components/Carousel';
import DisplayImg from '~/components/shared/DisplayImg';
import { displayTimeOfDay } from '~/utils/misc';
import ResultEntryDescription from '~/components/shared/ResultEntryDescription';

type Props = {
  actions?: React.ReactNode;
  footer?: ReactNode;
  group: Group;
  img?: string;
} & React.ComponentProps<'div'>;

export default function GroupEntry({ group, actions, footer, img }: Props) {
  const { t } = useTranslation('m-groups');
  const tc = useTranslation('common').t;
  const navigate = useNavigate();

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

  const schedule = group?.schedules
    ?.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map(
      ({ dayOfWeek, timeOfDay }) =>
        `${translateDay(dayOfWeek)}, ${displayTimeOfDay(timeOfDay)}`
    )
    .join(' | ');

  function goToGroupDetail() {
    navigate(`/group/${group.slug}`);
  }

  return (
    <div
      className={`relative p-4 flex mb-12 flex-col md:flex-row cursor-pointer
        border-b last:border-none border-gray-300 dark:border-gray-300`}
      data-cy="group-entry"
      onClick={goToGroupDetail}
    >
      <GroupImage group={group} img={img} />
      <div className="w-full h-full p-2 lg:pl-6">
        <div className="flex flex-col">
          <a
            href={`/group/${group.slug}`}
            className="text-lg font-extrabold dark:text-white"
            data-cy="group-name"
          >
            {group.name}
          </a>
          <span
            className="mb-4 dark:text-white font-bold capitalize"
            data-cy="group-schedule"
          >
            {schedule}
          </span>
          <Feature
            label={t('Who')}
            value={group.createdBy?.name || group.createdById}
          />
          <Feature label={t('Where')} value={group.near || ''}>
            &nbsp;
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${group.lat}%2C${group.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              ({t('View in Map')})
            </a>
          </Feature>
          <div
            className="flex justify-between align-middle"
            data-cy="group-spirit"
          >
            <Feature
              label={t('Purpose')}
              value={group.groupSpirit?.name || ''}
            />
          </div>
          <ResultEntryDescription
            text={group.description}
            label={t('Description')}
            less={t('Read Less')}
            more={t('Read More')}
          />
          {footer && (
            <div className="absolute bottom-4 right-4 font-medium">
              {footer}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="absolute top-0 right-0 p-2 pt-6">{actions}</div>
      )}
    </div>
  );
}

function PlaceholderImg({
  group,
  img
}: {
  group: Group;
  className: string;
  img?: string;
}) {
  if (!img) {
    return null;
  }
  return (
    <DisplayImg
      imageId={`product/sports/${img}`}
      alt={group.name || ''}
      variant="List"
    />
  );
}

type FeatureProps = {
  value: string | TranslationObject;
  label?: string;
} & React.ComponentProps<'div'>;

function Feature({ value, label, children }: FeatureProps) {
  return (
    <>
      <div className="flex flex-col align-middle mb-4">
        <div className="dark:text-blueGray-500 text-sm font-medium mr-2">
          {label}
        </div>
        <div className="inline-block dark:text-white text-gray-500 text-base">
          {typeof value === 'string' ? value : <I18nText text={value} />}
          {children}
        </div>
      </div>
    </>
  );
}

function GroupImage({ group, img }: { group: Group; img?: string }) {
  function Wrapper({ children }: {} & React.ComponentProps<'div'>) {
    return <div className="w-full lg:w-144 lg:max-h-144">{children}</div>;
  }

  const { image1, image2, image3 } = group;
  const images: string[] = [image1, image2, image3].filter(Boolean) as string[];

  if (images.length === 0) {
    return (
      <Wrapper>
        <PlaceholderImg
          group={group}
          img={img}
          className="w-full rounded-lg bg-gray-100 dark:bg-gray-400 object-cover object-left-top"
        />
      </Wrapper>
    );
  }

  if (images.length === 1) {
    return (
      <Wrapper>
        <DisplayImg
          imageId={image1 || image2 || image3 || ''}
          alt={group.name || ''}
          transformations={{
            resize: {
              type: 'fill',
              width: 400,
              height: 400
            }
          }}
        />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <Carousel images={images} />
    </Wrapper>
  );
}
