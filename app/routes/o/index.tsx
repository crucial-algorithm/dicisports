import { Form, Link, useLoaderData } from '@remix-run/react';
import type { LinksFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useTranslation } from 'react-i18next';

import type { Event } from '@prisma/client';

import React from 'react';
import clsx from 'clsx';

import { H4, H5, H6 } from '~/components/shared/typography';

import Button from '~/components/shared/Button';

import { findUserEvents } from '~/server/db/events.server';
import WhenListEmpty from '~/components/shared/Empty';

import type { Sport, EventStatus } from '~/types';
import DisplayImg from '~/components/shared/DisplayImg';

import { findSports } from '~/server/db/reference.server';
import { requireUser } from '~/server/auth/session.server';

type LoaderData = {
  events: Array<Event>;
};

export const handle = {
  i18n: ['common', 'organizer']
};

export const loader: LoaderFunction = async ({ request }) => {
  // TODO: this should be restricted to organisers
  const user = await requireUser(request);

  const events = await findUserEvents(user.id);
  const sports = await findSports();

  return json({
    events,
    sports
  });
};

export const links: LinksFunction = () => {
  return [];
};

function target(status: EventStatus, id: string) {
  if (['published', 'unpublished'].indexOf(status) >= 0) {
    return `/o/event/${id}/dashboard`;
  }

  return `/o/event/${id}`;
}

export default function OrganizerIndexRoute() {
  const { t } = useTranslation('organizer');
  const { events, sports } = useLoaderData<LoaderData>();

  return (
    <>
      <div className="dark:text-blueGray-500">
        <div className="col-span-full mb-12 lg:mb-12">
          <div className="flex flex-col-reverse justify-end lg:flex-row lg:items-center">
            <Form method="post" action="/o/event/create">
              <Button variant="secondary" name="create-event">
                <H6 as="span">{t('Create')}</H6>
              </Button>
            </Form>
          </div>
        </div>
        <H5 className="border-b mb-4">{t('Draft Events')}</H5>
        <div className="flex flex-wrap align-middle justify-start last:border-none">
          {events.filter((e: Event) => e.status === 'draft' || e.status === 'unpublished').map((event: Event) => (
            <EventEntry className="border-r" event={event} sports={sports} key={event.id} />
          ))}
        </div>
        <H5 className="border-b">{t('Published Events')}</H5>
        <div className="flex flex-wrap align-middle justify-start">
          {events.filter((e: Event) => e.status === 'published').map((event: Event) => (
            <EventEntry className="border-r" event={event} sports={sports} key={event.id} />
          ))}
        </div>
        <WhenListEmpty list={events}>
          <H4 variant="secondary" as="p" className="text-center p-12">
            {t('Events Empty')}
          </H4>
        </WhenListEmpty>
      </div>
    </>
  );
}

type EventEntryProps = {
  event: Event;
  sports: Sport[];
} & React.ComponentProps<'div'>;

function EventEntry({ event, sports, className }: EventEntryProps) {
  const { t } = useTranslation('organizer');

  return (
    <Link to={target(event.status, event.id)} key={event.id}>
      <div
        className={clsx(
          className,
          'relative flex flex-col p-4 mb-4 hover:bg-secondary',
          {
            'opacity-60':
              event.status === 'draft' || event.status === 'unpublished'
          }
        )}
        data-cy={`event-${event.id}`}
      >
        <div id="event-image">
          <H5 className={clsx('mb-5')}>{event.name || t('No Name')}</H5>
          <RaceImage
            event={event}
            img={
              sports.find((s: Sport) => s.id === event.sportId)?.picture
            }
          />
        </div>
        <div className="w-full h-full p-2 lg:pl-6" />
      </div>
    </Link>
  );
}

type PlaceholderImgProps = {
  event: Event;
  className: string;
  img?: string;
};

function PlaceholderImg({ event, img }: PlaceholderImgProps) {
  if (!img) {
    return null;
  }
  return (
    <DisplayImg
      imageId={`product/sports/${img}`}
      alt={event.name || ''}
      variant="List"
    />
  );
}

function RaceImage({ event, img }: { event: Event; img?: string }) {
  function Wrapper({ children }: {} & React.ComponentProps<'div'>) {
    return <div className="w-[50px] h-[50px]">{children}</div>;
  }

  const { image1, image2, image3 } = event;
  const images: string[] = [image1, image2, image3].filter(Boolean) as string[];

  return (
    <Wrapper>
      {images.length === 0 ? (
        <PlaceholderImg
          event={event}
          img={img}
          className="w-full rounded-lg bg-gray-100 dark:bg-gray-400 object-cover object-left-top"
        />
      ) : (
        <DisplayImg
          imageId={image1 || image2 || image3 || ''}
          transformations={{
            resize: {
              type: 'fill',
              width: 50,
              height: 50
            }
          }}
        />
      )}
    </Wrapper>
  );
}
