import { db } from '~/server/db.server';
import type { EventFilters, TranslationObject } from '~/types';

async function searchEvents(
  filters: EventFilters,
  chunkSize = 40,
  position = 0
): Promise<{ total: number; results: SearchEventResult[] }> {
  const { sport } = filters;
  const n = (a: any | null, b: string) =>
    a === null || (Array.isArray(a) && a.length === 0) ? '' : b;
  const iff = (a: boolean | null, b: string) =>
    a === null || a === false ? '' : b;
  const query = `
        SELECT *, count(1) over () as records
        FROM (SELECT e.id                                                                  AS "id",
                     e.name                                                                AS "name",
                     min(price)                                                            AS "minPrice",
                     d.name                                                                AS "difficulty",
                     e.start_at                                                            AS "startAt",
                     e.slug                                                                AS "slug",
                     e.sport_id                                                            AS "sportId",
                     e.lat                                                                 AS "lat",
                     e.lng                                                                 AS "lng",
                     e.place_name                                                          AS "location",
                     e.image1                                                              AS "image1",
                     e.image2                                                              AS "image2",
                     e.image3                                                              AS "image3",
                     e.image4                                                              AS "image4",
                     e.image5                                                              AS "image5",
                     e.status                                                              AS "status",
                     e.created_at                                                          AS "createdAt",
                     e.created_by                                                          AS "createdBy",
                     e.updated_at                                                          AS "updatedAt",
                     e.description                                                         AS "description",
                     e.series_id                                                           AS "seriesId",
                     e.edition                                                             AS "edition",
                     es.name                                                               AS "seriesName",
                     es.slug                                                               AS "seriesSlug",
                     o.name                                                                AS "user"
              FROM events e
                       INNER JOIN races r on e.id = r.event_id
                       INNER JOIN organizers o on e.created_by = o.user_id
                       INNER JOIN difficulties d on e.difficulty_id = d.id
                       LEFT JOIN event_series es on e.series_id = es.id
              WHERE e.status = 'published'
                AND DATE_TRUNC('DAY', end_at) + INTERVAL '1 DAY' >= CURRENT_TIMESTAMP
                ${n(sport, `AND e.sport_id = ${sport}`)}
                ${iff(
                  filters.timedEvents === 'included',
                  'AND EXISTS (SELECT 1 FROM perks WHERE event_id = e.id AND name = \'Resultados cronometrados\' AND is_enabled IS TRUE)'
                )}
                ${iff(
                  filters.timedEvents === 'excluded',
                  'AND NOT EXISTS (SELECT 1 FROM perks WHERE event_id = e.id AND name = \'Resultados cronometrados\' AND is_enabled IS TRUE)'
                )}
                ${n(filters.region, `AND e.location ->> 'region' = '${filters.region}'`)}
              GROUP BY e.id, o.name, d.name, es.id) as r 
              ORDER BY "createdAt" DESC
            LIMIT ${chunkSize} OFFSET ${position * chunkSize};
    `;

  const results: Array<RawSearchEventResult> = await db.$queryRawUnsafe<
    Array<RawSearchEventResult>
  >(query);

  // console.log('---> query', query);

  const mapped: SearchEventResult[] = results.map(({ records, ...result }) => ({
    ...result
  }));
  const total = results.length === 0 ? 0 : Number(results[0].records);

  return { results: mapped, total };
}

type RawSearchEventResult = {
  id: string;
  name: string;
  minPrice: number;
  difficulty: TranslationObject;
  startAt: string;
  slug: string;
  sportId: number;
  lat: number;
  lng: number;
  location: string;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  image5: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  seriesId: string | null;
  edition: string | null;
  seriesName: string | null;
  seriesSlug: string | null;
  user: string;
  records: number;
};

type SearchEventResult = Omit<RawSearchEventResult, 'records'>;

async function searchEventsBySportAndLocation(
  sportId: number,
  region: string,
  coordinates?: { lat: number; lng: number },
  radiusKm: number = 30
): Promise<{ total: number; results: SearchEventResult[] }> {
  const lat = coordinates?.lat || null;
  const lng = coordinates?.lng || null;
  
  const query = `
    SELECT *, count(1) over () as records
    FROM (SELECT e.id                                                                  AS "id",
                 e.name                                                                AS "name",
                 min(price)                                                            AS "minPrice",
                 d.name                                                                AS "difficulty",
                 e.start_at                                                            AS "startAt",
                 e.slug                                                                AS "slug",
                 e.sport_id                                                            AS "sportId",
                 e.lat                                                                 AS "lat",
                 e.lng                                                                 AS "lng",
                 e.place_name                                                          AS "location",
                 e.image1                                                              AS "image1",
                 e.image2                                                              AS "image2",
                 e.image3                                                              AS "image3",
                 e.image4                                                              AS "image4",
                 e.image5                                                              AS "image5",
                 e.status                                                              AS "status",
                 e.created_at                                                          AS "createdAt",
                 e.created_by                                                          AS "createdBy",
                 e.updated_at                                                          AS "updatedAt",
                 e.description                                                         AS "description",
                 e.series_id                                                           AS "seriesId",
                 e.edition                                                             AS "edition",
                 es.name                                                               AS "seriesName",
                 es.slug                                                               AS "seriesSlug",
                 o.name                                                                AS "user"
          FROM events e
                   INNER JOIN races r on e.id = r.event_id
                   INNER JOIN organizers o on e.created_by = o.user_id
                   INNER JOIN difficulties d on e.difficulty_id = d.id
                   LEFT JOIN event_series es on e.series_id = es.id
          WHERE e.status = 'published'
            AND DATE_TRUNC('DAY', end_at) + INTERVAL '1 DAY' >= CURRENT_TIMESTAMP
            AND e.sport_id = ${sportId}
            AND (e.location ->> 'region' = '${region}' OR e.place_name ILIKE '%${region}%')
            ${lat !== null && lng !== null ? `
            AND (6371.0 *
                 acos(LEAST(cos(radians(${lat})) * cos(radians(e.lat)) * cos(radians(e.lng) - radians(${lng})) +
                            sin(radians(${lat})) * sin(radians(e.lat)), 1))) < ${radiusKm}
            ` : ''}
          GROUP BY e.id, o.name, d.name, es.id) as r 
          ORDER BY ${lat !== null && lng !== null ? `
            (6371.0 *
             acos(LEAST(cos(radians(${lat})) * cos(radians(r.lat)) * cos(radians(r.lng) - radians(${lng})) +
                        sin(radians(${lat})) * sin(radians(r.lat)), 1))) ASC,
          ` : ''} "createdAt" DESC;
  `;

  const results: Array<RawSearchEventResult> = await db.$queryRawUnsafe<
    Array<RawSearchEventResult>
  >(query);

  const mapped: SearchEventResult[] = results.map(({ records, ...result }) => ({
    ...result
  }));
  
  const total = results.length === 0 ? 0 : Number(results[0].records);

  return { results: mapped, total };
}

export { searchEvents, searchEventsBySportAndLocation };

export type { SearchEventResult };
