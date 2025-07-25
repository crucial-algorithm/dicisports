import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { useTranslation } from 'react-i18next';

import EventResult from '~/components/SearchEventResult';
import Main from '~/components/shared/Main';
import { H1, H2 } from '~/components/shared/typography';
import { Spacer } from '~/components/shared/Spacer';
import type { SearchEventResult } from '~/server/db/search.server';
import { searchEventsBySportAndLocation } from '~/server/db/search.server';
import type { Language, Sport } from '~/types';
import { getI18nText } from '~/components/I18nText';
import { useRootData } from '~/hooks';
import { getSportBySlug, getLocationBySlug } from '~/server/db/sportAndLocation.server';

type LoaderData = {
  events: SearchEventResult[];
  sport: Sport;
  location: {
    name: string;
    slug: string;
    region: string;
    coordinates?: { lat: number; lng: number };
  };
  total: number;
  language: Language;
};

export const handle = {
  i18n: ['common', 'home', 'eblas']
};

export const meta: MetaFunction<typeof loader> = ({ data, params }) => {
  if (!data) {
    return [
      { title: 'Página não encontrada' },
      { name: 'description', content: 'A página que procura não foi encontrada.' }
    ];
  }

  const { sport, location, total, language } = data;
  const sportName = getI18nText(sport.name, language);
  const locationName = location.name;

  const title = `${sportName} em ${locationName} - ${total} eventos`;
  const description = `Encontre os melhores eventos de ${sportName.toLowerCase()} em ${locationName} e arredores. ${total} eventos disponíveis para inscrição.`;

  return [
    { title },
    { name: 'description', content: description },
    { name: 'keywords', content: `${sportName}, ${locationName}, eventos, desporto, inscrições` },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { name: 'robots', content: 'index, follow' },
    { name: 'geo.region', content: location.region },
    { name: 'geo.placename', content: locationName },
    ...(location.coordinates ? [
      { name: 'geo.position', content: `${location.coordinates.lat};${location.coordinates.lng}` },
      { name: 'ICBM', content: `${location.coordinates.lat}, ${location.coordinates.lng}` }
    ] : [])
  ];
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const { lang = 'pt', sport: sportSlug, location: locationSlug } = params;
  const language = lang as Language;

  // Get sport by slug (e.g., 'corridas' -> running sport)
  const sport = await getSportBySlug(sportSlug!, language);
  
  if (!sport) {
    throw new Response('Sport not found', { status: 404 });
  }

  // Get location data by slug (e.g., 'lisboa' -> Lisbon location data)
  const location = await getLocationBySlug(locationSlug!, language);

  if (!location) {
    throw new Response('Location not found', { status: 404 });
  }

  // Search for events within 30km radius
  const { results, total } = await searchEventsBySportAndLocation(
    sport.id,
    location.region,
    location.coordinates,
    30 // 30km radius
  );

  return json({
    events: results,
    sport,
    location,
    total,
    language
  } as LoaderData);
};

export default function SportLocationPage() {
  const { events, sport, location, total } = useLoaderData<LoaderData>();
  const { sports } = useRootData();
  const { t, i18n } = useTranslation(['eblas', 'common']);

  const sportName = getI18nText(sport.name as any, i18n.language as Language);
  const locationName = location.name;

  return (
    <Main className="dark:text-blueGray-500 relative mb-8">
      <div className="max-w-6xl mx-auto px-4">
        <Spacer size="xs" />
        
        <H1 className="text-center mb-4">
          {t('eblas:events_in_location', { sport: sportName, location: locationName })}
        </H1>
        
        <div className="text-center text-gray-600 dark:text-gray-400 mb-8">
          {total > 0 ? (
            <p>{t('eblas:found_events', { count: total, location: locationName })}</p>
          ) : (
            <p>{t('eblas:no_events_found', { sport: sportName.toLowerCase(), location: locationName })}</p>
          )}
        </div>

        {events.length > 0 && (
          <>
            <H2 className="mb-6">
              {t('eblas:upcoming_events')}
            </H2>
            
            {events.map((event) => (
              <EventResult
                key={event.id}
                event={event}
                img={sports.find((s) => s.id === event.sportId)?.picture}
                isUserFavorite={false}
              />
            ))}
          </>
        )}

        {events.length === 0 && (
          <div className="text-center py-12">
            <H2 className="mb-4">{t('eblas:no_events_title')}</H2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('eblas:no_events_description', { sport: sportName.toLowerCase(), location: locationName })}
            </p>
            <div className="space-y-2">
              <p>{t('eblas:suggestions')}:</p>
              <ul className="list-disc list-inside text-left max-w-md mx-auto space-y-1">
                <li>{t('eblas:try_nearby_locations')}</li>
                <li>{t('eblas:check_other_sports')}</li>
                <li>{t('eblas:subscribe_notifications')}</li>
              </ul>
            </div>
          </div>
        )}

        <Spacer size="xs" />
        
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 mt-12">
          <H2 className="mb-4">
            {t('eblas:about_sport_in_location', { sport: sportName, location: locationName })}
          </H2>
          <div className="prose dark:prose-invert max-w-none">
            <p>
              {t('eblas:location_description', { 
                sport: sportName.toLowerCase(), 
                location: locationName,
                region: location.region 
              })}
            </p>
            <p>
              {t('eblas:platform_benefits')}
            </p>
          </div>
        </div>
      </div>
    </Main>
  );
}
