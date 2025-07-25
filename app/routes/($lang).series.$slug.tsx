import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { useTranslation } from 'react-i18next';

import { findEventSeriesBySlug } from '~/server/db/event-series.server';
import Main from '~/components/shared/Main';
import { H1, H2, H3, Paragraph } from '~/components/shared/typography';
import DisplayDate from '~/components/shared/DIsplayDate';
import DisplayImg from '~/components/shared/DisplayImg';
import useLang from '~/hooks/useLang';

type Event = {
  id: string;
  name: string;
  slug: string;
  startAt: string;
  placeName?: string;
  edition?: string;
  image1?: string;
};

type EventSeries = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  events: Event[];
};

type LoaderData = {
  series: EventSeries;
};

export const handle: { id: string; i18n: string[] } = {
  id: 'series',
  i18n: ['event', 'organizer']
};

export const meta: MetaFunction<LoaderData> = ({ data }) => {
  const loaderData = data as LoaderData;

  return [
    {
      title: loaderData.series
        ? `${loaderData.series.name} - DiciSports`
        : 'DiciSports - This Is Sports'
    }
  ];
};

export const loader: LoaderFunction = async ({ params }) => {
  const slug = params.slug as string;

  if (!slug) {
    throw new Response('Series not found', { status: 404 });
  }

  const series = await findEventSeriesBySlug(slug);

  if (!series) {
    throw new Response('Series not found', { status: 404 });
  }

  return json({
    series
  });
};

export default function SeriesRoute() {
  const { series } = useLoaderData<LoaderData>();
  const { t } = useTranslation('event');
  const lang = useLang();

  // Smart sorting: numeric editions first (by year), then alphabetical
  const sortedEvents = series.events.sort((a: Event, b: Event) => {
    const aEdition = a.edition || '';
    const bEdition = b.edition || '';
    
    // Check if editions are years (4 digits)
    const aIsYear = /^\d{4}$/.test(aEdition);
    const bIsYear = /^\d{4}$/.test(bEdition);
    
    if (aIsYear && bIsYear) {
      return parseInt(bEdition) - parseInt(aEdition); // Newest first
    }
    if (aIsYear && !bIsYear) {return -1;} // Years come first
    if (!aIsYear && bIsYear) {return 1;}
    
    // For non-year editions, sort alphabetically
    return aEdition.localeCompare(bEdition);
  });

  return (
    <Main>
      <div className="mb-8">
        <H1 data-cy="series-name">{series.name}</H1>
        {series.description && (
          <Paragraph className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            {series.description}
          </Paragraph>
        )}
      </div>

      <div className="mb-8">
        <H2>{t('All Editions')}</H2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {sortedEvents.map((event) => (
            <Link
              key={event.id}
              to={`/${lang}/event/${event.slug}`}
              className="block border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              data-cy={`edition-${event.id}`}
            >
              <div className="aspect-w-16 aspect-h-9">
                <DisplayImg
                  imageId={event.image1 || ''}
                  alt={event.name || ''}
                  className="w-full h-48 object-cover"
                  transformations={{
                    resize: {
                      type: 'fill',
                      width: 400,
                      height: 300
                    }
                  }}
                />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <H3 className="text-lg font-semibold" data-cy="event-name">
                    {event.name}
                  </H3>
                  {event.edition && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded">
                      {event.edition}
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400" data-cy="event-date">
                  <DisplayDate date={new Date(event.startAt || 0)} />
                </div>
                {event.placeName && (
                  <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    {event.placeName}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {sortedEvents.length === 0 && (
          <div className="text-center py-12">
            <Paragraph className="text-gray-500 dark:text-gray-400">
              {t('No events found in this series')}
            </Paragraph>
          </div>
        )}
      </div>
    </Main>
  );
}
