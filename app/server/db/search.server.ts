import { db } from '~/server/db.server';
import type {
  DBRawSearchResults,
  EventFilters,
  GroupFilters,
  GroupSearchResult,
  TranslationObject
} from '~/types';
import { dbRawSearchResultsToSearchResults } from '~/server/db/codecs.server';

async function searchGroups(
  lat: number | null,
  lng: number | null,
  filters: GroupFilters,
  chunkSize = 40,
  position = 0,
  userLocation: [number, number] | null,
  orderByProximity: boolean
): Promise<{ total: number; results: GroupSearchResult[] }> {
  const { spirit, sport, dayOfWeek, timeOfDay } = filters;
  const n = (a: any | null, b: string) =>
    a === null || (Array.isArray(a) && a.length === 0) ? '' : b;
  const s = (a: number[] | null): number[] => (a ? a : []);
  const [b, e] = s(timeOfDay);
  const [myLat, myLng] = userLocation || [lat, lng];
  const orderBy =
    orderByProximity && userLocation !== null ? 'distance' : 'created_at DESC';
  const query = `
        SELECT *, count(1) over () as records
        FROM (SELECT floor((6357.0 *
                            acos(LEAST(cos(radians(${lat})) * cos(radians(g.lat)) * cos(radians(g.lng) - radians(${lng})) +
                                       sin(radians(${lat})) * sin(radians(g.lat)),
                                       1))))                                                AS distance_to_searched_location,
                     floor((6357.0 *
                            acos(LEAST(cos(radians(${myLat})) * cos(radians(g.lat)) *
                                       cos(radians(g.lng) - radians(${myLng})) +
                                       sin(radians(${myLat})) * sin(radians(g.lat)), 1)))) AS distance,
                     g.id                                                                   AS "id",
                     g.name                                                                 AS "name",
                     null                                                                   AS "min_price",
                     null                                                                   AS "difficulty",
                     null                                                                   AS "start_at",
                     g.slug                                                                 AS "slug",
                     g.sport_id                                                             AS "sport_id",
                     g.group_type_id                                                        AS "group_type_id",
                     g.group_spirit_id                                                      AS "group_spirit_id",
                     g.lat                                                                  AS "lat",
                     g.lng                                                                  AS "lng",
                     g.location                                                             AS "location",
                     g.near                                                                 AS "near",
                     g.whatsapp                                                             AS "whatsapp",
                     g.image1                                                               AS "image1",
                     g.image2                                                               AS "image2",
                     g.image3                                                               AS "image3",
                     null                                                                   AS "image4",
                     null                                                                   AS "image5",
                     g.status                                                               AS "status",
                     g.created_at                                                           AS "created_at",
                     g.created_by                                                           AS "created_by",
                     g.updated_at                                                           AS "updated_at",
                     g.description                                                          AS "description",
                     u.name                                                                 AS "user_name",
                     gs.name                                                                AS "group_spirit",
                     array_agg(gsc.id || ':' || gsc.day_of_week || ':' || gsc.time_of_day)  AS "schedules"
              FROM groups g
                       INNER JOIN users u ON g.created_by = u.id
                       INNER JOIN groups_spirit gs on g.group_spirit_id = gs.id
                       INNER JOIN group_schedule gsc on gsc.group_id = g.id
              WHERE status = 'published'
                AND (6357.0 *
                     acos(LEAST(cos(radians(${lat})) * cos(radians(g.lat)) * cos(radians(g.lng) - radians(${lng})) +
                                sin(radians(${lat})) * sin(radians(g.lat)), 1))) < ${ lat === null ? 1000000000 : 30 }
                ${n(spirit, `AND gs.id IN (${s(spirit).join(', ')})`)}
                ${n(sport, `AND g.sport_id = ${sport}`)}
                ${n(dayOfWeek, `AND gsc.day_of_week = ${dayOfWeek}`)}
                ${n(timeOfDay, `AND gsc.time_of_day BETWEEN ${b} AND ${e}`)}
              GROUP BY g.id, g.name, g.slug, g.sport_id, g.group_type_id, g.group_spirit_id, g.lat, g.lng, g.location,
                       g.near, g.whatsapp, g.image1, g.image2, g.image3, g.status, g.created_at, g.created_by,
                       g.updated_at,
                       g.description, u.name, gs.name) as r 
              ORDER BY ${orderBy} 
            LIMIT ${chunkSize} OFFSET ${position * chunkSize};
    `;

  const results: Array<DBRawSearchResults> = await db.$queryRawUnsafe<
    Array<DBRawSearchResults>
  >(query);
  const mapped = results.map(dbRawSearchResultsToSearchResults);
  const total = results.length === 0 ? 0 : Number(results[0].records);

  // console.log('----->', query);
  return { results: mapped, total };
}

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
                     u2.name                                                               AS "user"
              FROM events e
                       INNER JOIN races r on e.id = r.event_id
                       INNER JOIN users u2 on e.created_by = u2.id
                       INNER JOIN difficulties d on e.difficulty_id = d.id
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
              GROUP BY e.id, u2.name, d.name) as r 
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
  user: string;
  records: number;
};

type SearchEventResult = Omit<RawSearchEventResult, 'records'>;

export { searchGroups, searchEvents };

export type { SearchEventResult };
