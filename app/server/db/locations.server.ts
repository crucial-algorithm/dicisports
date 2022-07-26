import { db } from '~/server/db.server';
import type { DBRawGroup, Group, GroupFilters } from '~/types';
import { dbRawGroupToGroup } from '~/server/db/codecs.server';

async function findNearestGroups(
  lat: number,
  lng: number,
  filters: GroupFilters,
  chunkSize = 40,
  position = 0
): Promise<{ total: number; results: Group[] }> {
  const { spirit, sport, dayOfWeek, timeOfDay } = filters;
  const n = (a: any | null, b: string) =>
    a === null || (Array.isArray(a) && a.length === 0) ? '' : b;
  const s = (a: number[] | null): number[] => (a ? a : []);
  const [b, e] = s(timeOfDay);
  const query = `
      SELECT *, count(1) over () as records
      FROM (
               SELECT (6357.0 *
                       acos(LEAST(cos(radians(${lat})) * cos(radians(lat)) * cos(radians(lng) - radians(${lng})) +
                                  sin(radians(${lat})) * sin(radians(lat)), 1))) AS distance,
                      g.*,
                      u.name                                                     AS "user_name",
                      gs.name                                                    AS "group_spirit"
               FROM groups g
                        INNER JOIN users u ON g.created_by = u.id
                        INNER JOIN groups_spirit gs on g.group_spirit_id = gs.id
               WHERE status = 'published'
                   ${n(spirit, `AND gs.id IN (${s(spirit).join(', ')})`)}
                   ${n(sport, `AND g.sport_id = ${sport}`)}
                   ${n(dayOfWeek, `AND g.day_of_week = ${dayOfWeek}`)}
                   ${n(timeOfDay, `AND g.time_of_day BETWEEN ${b} AND ${e}`)}
               ORDER BY 1
           ) x
      LIMIT ${chunkSize} OFFSET ${position * chunkSize}
  `;
  //console.log('----->', query)
  const results: Array<DBRawGroup> = await db.$queryRawUnsafe(query);
  const mapped = results.map(dbRawGroupToGroup);
  const total = results.length === 0 ? 0 : results[0].records;

  return { results: mapped, total };
}

export { findNearestGroups };
