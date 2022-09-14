import type { ReactNode } from 'react';
import React, { useLayoutEffect, useRef, useState } from 'react';

import { useTranslation } from 'react-i18next';

import clsx from 'clsx';

import { Carousel } from 'react-responsive-carousel';

import type { Group, TranslationObject } from '~/types';
import I18nText from '~/components/I18nText';
import DisplayImg from '~/components/shared/DisplayImg';
import { displayTimeOfDay } from '~/utils/misc';

type Props = {
  actions?: React.ReactNode;
  footer?: ReactNode;
  group: Group;
  img?: string;
} & React.ComponentProps<'div'>;

export default function GroupEntry({ group, actions, footer, img }: Props) {
  const targetRef = useRef();
  const { t } = useTranslation('m-groups');
  const tc = useTranslation('common').t;
  const [click, setClick] = useState<boolean>(false);
  const [lines, setLines] = useState(0);
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

  function handleReadMore() {
    click ? setClick(false) : setClick(true);
  }

  function showMore(text: string) {
    return (
      text
        .split(/\r\n|\r|\n/)
        .map((str) => str.match(/.{1,20}/g).length)
        .reduce((p, c) => c + (p || 0)) > 3
    );
  }

  useLayoutEffect(() => {
    if (targetRef.current) {
      console.log({
        width: targetRef.current.offsetWidth,
        height: targetRef.current.offsetHeight
      });
    }
  }, []);

  return (
    <div
      className={clsx(
        'relative flex mb-12',
        'flex-col',
        'md:flex-row',
        'p-4',
        'border-b last:border-none border-gray-300 dark:border-gray-300'
      )}
    >
      <GroupImage group={group} img={img} />
      <div className="w-full h-full p-2 lg:pl-6">
        <div className="flex flex-col">
          <span className={clsx('mb-4 text-base font-medium')}>
            {`${day}, ${displayTimeOfDay(group.timeOfDay)}`}
          </span>
          <span className={clsx('mb-4 text-lg font-extrabold dark:text-white')}>
            {group.name}
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
            >
              ({t('View in Map')})
            </a>
          </Feature>
          <div className="flex justify-between align-middle">
            <Feature
              label={t('Purpose')}
              value={group.groupSpirit?.name || ''}
            />
          </div>
          {group.description ? (
            <>
              <div className="flex flex-col align-middle mb-4">
                <div className="dark:text-blueGray-500 text-sm font-medium mr-2">
                  {t('Description')}
                </div>
                <div
                  className={clsx(
                    click
                      ? 'break-words line-clamp-none whitespace-pre-wrap max-w-[90ch] dark:text-white text-gray-500 text-base'
                      : 'break-words line-clamp-3 whitespace-pre-wrap max-w-[90ch] dark:text-white text-gray-500 text-base'
                  )}
                  ref={targetRef}
                >
                  {group.description}
                </div>
                {showMore(group.description) ? (
                  <label
                    className="w-20"
                    role="button"
                    onClick={handleReadMore}
                  >
                    {click ? t('Read Less') : t('Read More')}
                  </label>
                ) : null}
              </div>
              {footer ? <div className="flex content-end">{footer}</div> : null}
            </>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="absolute top-0 right-0 p-4 pt-6">{actions}</div>
      ) : null}
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
      id={`product/sports/${img}`}
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
          {typeof value === 'string' ? value : I18nText({ text: value })}
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
          id={image1 || image2 || image3 || ''}
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

  function cleanStatus() {
    return '';
  }

  return (
    <Wrapper>
      <Carousel statusFormatter={cleanStatus}>
        {images.map((image, idx) => (
          <DisplayImg
            key={idx}
            id={image}
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
    </Wrapper>
  );
}
