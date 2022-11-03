import { Form, Link, useLoaderData } from '@remix-run/react';
import type { LinksFunction, LoaderFunction } from 'remix';
import { json } from 'remix';
import { useTranslation } from 'react-i18next';

import type { Event } from '@prisma/client';

import React from 'react';
import clsx from 'clsx';

import { H4, H5, H6 } from '~/components/shared/typography';

import Button from '~/components/shared/Button';

import Main from '~/components/shared/Main';

import { findUserEvents } from '~/server/db/events.server';
import WhenListEmpty from '~/components/shared/Empty';

import type { Sport } from '~/types';
import DisplayImg from '~/components/shared/DisplayImg';

import { findSports } from '~/server/db/sports.server';
import { requireAdminUser } from '~/server/auth/session.server';

type LoaderData = {
  events: Array<Event>;
};

export const handle = {
  i18n: ['common', 'organizer']
};

export const loader: LoaderFunction = async ({ request }) => {
  // hide while this is still in dev
  const user = await requireAdminUser(request);

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

export default function OrganizerIndexRoute() {
  const { t } = useTranslation('organizer');
  const { events, sports } = useLoaderData<LoaderData>();

  return (
    <Main>
      <div className="dark:text-blueGray-500">
        <div className="col-span-full mb-12 lg:mb-12">
          <div className="flex flex-col-reverse justify-end lg:flex-row lg:items-center">
            <Form method="post" action="/organizer/event/create">
              <Button variant="secondary" name="create-event">
                <H6 as="span">{t('Create')}</H6>
              </Button>
            </Form>
          </div>
        </div>
        <div className="events-list">
          {events.map((event: Event) => (
            <Link to={`/organizer/event/${event.id}`} key={event.id}>
              <div
                className={clsx(
                  'relative flex mb-12',
                  'flex-col',
                  'p-4',
                  'border-b border-gray-300 dark:border-gray-300',
                  {
                    'opacity-60':
                      event.status === 'draft' || event.status === 'unpublished'
                  }
                )}
              >
                <div id="event-image">
                  <H5 className={clsx('mb-5')}>{event.name}</H5>
                  <RaceImage
                    event={event}
                    img={
                      sports.find((s: Sport) => s.id === event.sportId)?.picture
                    }
                  />
                </div>
                <div className="w-full h-full p-2 lg:pl-6"></div>
              </div>
            </Link>
          ))}
        </div>
        <WhenListEmpty list={events}>
          <H4 variant="secondary" as="p" className="text-center p-12">
            {t('Events Empty')}
          </H4>
        </WhenListEmpty>
      </div>
    </Main>
  );
}

function PlaceholderImg({
  event,
  img
}: {
  event: Event;
  className: string;
  img?: string;
}) {
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
    return <div className="w-[100px] h-[100px]">{children}</div>;
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
              width: 100,
              height: 100
            }
          }}
        />
      )}
    </Wrapper>
  );
}
