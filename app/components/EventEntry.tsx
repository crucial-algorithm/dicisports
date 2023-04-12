import clsx from 'clsx';
import type { ReactNode } from 'react';
import React from 'react';
import { Carousel } from 'react-responsive-carousel';
import { useTranslation } from 'react-i18next';

import type { TranslationObject, User } from '~/types';
import DisplayImg from '~/components/shared/DisplayImg';
import DisplayDate from '~/components/shared/DIsplayDate';
import I18nText from '~/components/I18nText';
import ResultEntryDescription from '~/components/shared/ResultEntryDescription';

export type DisplayEvent = {
  id: string;
  name: string;
  slug: string;
  startAt: Date | null;
  location: string;
  lat: number;
  lng: number;
  description: string | null;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  image5: string | null;
  createdBy: User;
  difficulty: TranslationObject | null;
};

type FeatureProps = {
  value: string | TranslationObject;
  label?: string;
} & React.ComponentProps<'div'>;

export default function EventEntry({
  event,
  img,
  footer,
  actions
}: {
  event: DisplayEvent;
  img?: string;
  footer?: ReactNode;
  actions?: React.ReactNode;
}) {
  const { t, i18n } = useTranslation('organizer');

  return (
    <div
      className={clsx(
        'relative flex mb-12',
        'flex-col',
        'md:flex-row',
        'p-4',
        'border-b last:border-none border-gray-300 dark:border-gray-300'
      )}
      data-cy="event-entry"
    >
      <EventImage event={event} img={img} />
      <div className="w-full h-full p-2 lg:pl-6">
        <div className="flex flex-col">
          <a
            href={`${i18n.language}/event/${event.slug}`}
            className="text-lg font-extrabold dark:text-white cursor-pointer"
            data-cy="event-name"
          >
            {event.name}
          </a>
          <span
            className="mb-4 dark:text-white font-bold capitalize"
            data-cy="event-schedule"
          >
            <DisplayDate date={new Date(event.startAt || 0)} />
          </span>
          <Feature label={t('Who')} value={event.createdBy?.name || ''} />
          <Feature label={t('Where')} value={event.location || ''}>
            &nbsp;
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${event.lat}%2C${event.lng}`}
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
            <Feature label={t('Difficulty')} value={event.difficulty || ''} />
          </div>
          <ResultEntryDescription
            text={event.description}
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

function EventImage({ event, img }: { event: DisplayEvent; img?: string }) {
  function Wrapper({ children }: {} & React.ComponentProps<'div'>) {
    return <div className="w-full lg:w-144 lg:max-h-144">{children}</div>;
  }

  const { image1, image2, image3, image4, image5 } = event;
  const images: string[] = [image1, image2, image3, image4, image5].filter(
    Boolean
  ) as string[];

  function cleanStatus() {
    return '';
  }

  return (
    <Wrapper>
      {images.length === 1 && (
        <DisplayImg
          imageId={image1 || image2 || image3 || image4 || image5 || ''}
          alt={event.name || ''}
          transformations={{
            resize: {
              type: 'fill',
              width: 400,
              height: 400
            }
          }}
        />
      )}

      {images.length === 0 && (
        <DisplayImg
          imageId={`product/sports/${img}`}
          alt={event.name || ''}
          variant="List"
        />
      )}

      {images.length > 1 && (
        <Carousel statusFormatter={cleanStatus}>
          {images.map((image, idx) => (
            <DisplayImg
              key={idx}
              imageId={image}
              transformations={{
                resize: {
                  type: 'fill',
                  width: 400,
                  height: 400
                }
              }}
            />
          ))}
        </Carousel>
      )}
    </Wrapper>
  );
}

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
