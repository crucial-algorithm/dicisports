import { db } from '~/server/db.server';
import type { DBRawGroup, Group, GroupFilters } from '~/types';
import { dbRawGroupToGroup } from '~/server/db/codecs.server';

async function findGroups(
  lat: number | null,
  lng: number | null,
  filters: GroupFilters,
  chunkSize = 40,
  position = 0,
  userLocation: [number, number] | null,
  orderByProximity: boolean
): Promise<{ total: number; results: Group[] }> {
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
                                       sin(radians(${lat})) * sin(radians(g.lat)), 1))))       AS distance_to_searched_location,
                     floor((6357.0 *
                            acos(LEAST(cos(radians(${myLat})) * cos(radians(g.lat)) * cos(radians(g.lng) - radians(${myLng})) +
                                       sin(radians(${myLat})) * sin(radians(g.lat)), 1))))     AS distance,
                     g.id                                                                      AS "id",
                     g.name                                                                    AS "name",
                     g.slug                                                                    AS "slug",
                     g.sport_id                                                                AS "sport_id",
                     g.group_type_id                                                           AS "group_type_id",
                     g.group_spirit_id                                                         AS "group_spirit_id",
                     g.lat                                                                     AS "lat",
                     g.lng                                                                     AS "lng",
                     g.location                                                                AS "location",
                     g.near                                                                    AS "near",
                     g.whatsapp                                                                AS "whatsapp",
                     g.image1                                                                  AS "image1",
                     g.image2                                                                  AS "image2",
                     g.image3                                                                  AS "image3",
                     g.status                                                                  AS "status",
                     g.created_at                                                              AS "created_at",
                     g.created_by                                                              AS "created_by",
                     g.updated_at                                                              AS "updated_at",
                     g.description                                                             AS "description",
                     u.name                                                                    AS "user_name",
                     gs.name                                                                   AS "group_spirit",
                     array_agg(gsc.id || ':' || gsc.day_of_week || ':' || gsc.time_of_day)     AS "schedules"
              FROM groups g
                       INNER JOIN users u ON g.created_by = u.id
                       INNER JOIN groups_spirit gs on g.group_spirit_id = gs.id
                       INNER JOIN group_schedule gsc on gsc.group_id = g.id
              WHERE status = 'published'
                AND (6357.0 *
                     acos(LEAST(cos(radians(${lat})) * cos(radians(g.lat)) * cos(radians(g.lng) - radians(${lng})) +
                                sin(radians(${lat})) * sin(radians(g.lat)), 1))) < ${lat === null ? 1000000000 : 30 }
                ${n(spirit, `AND gs.id IN (${s(spirit).join(', ')})`)}
                ${n(sport, `AND g.sport_id = ${sport}`)}
                ${n(dayOfWeek, `AND gsc.day_of_week = ${dayOfWeek}`)}
                ${n(timeOfDay, `AND gsc.time_of_day BETWEEN ${b} AND ${e}`)}     
              GROUP BY g.id, g.name, g.slug, g.sport_id, g.group_type_id, g.group_spirit_id, g.lat, g.lng, g.location,
                       g.near, g.whatsapp, g.image1, g.image2, g.image3, g.status, g.created_at, g.created_by,
                       g.updated_at,
                       g.description, u.name, gs.name) grps
        ORDER BY ${orderBy}
            LIMIT ${chunkSize}
        OFFSET ${position * chunkSize};
    `;

  const results: Array<DBRawGroup> = await db.$queryRawUnsafe(query);
  const mapped = results.map(dbRawGroupToGroup);
  const total = results.length === 0 ? 0 : results[0].records;

  // console.log('----->', query);
  return { results: mapped, total };
}

export { findGroups };
