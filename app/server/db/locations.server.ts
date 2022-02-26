import { db } from '~/server/db.server'
import { DBRawGroup, Location } from '~/types'
import {
  dbLocationToLocation,
  dbRawGroupToGroup
} from '~/server/db/codecs.server'
import { time } from '~/server/metrics.server'

async function findCity(search: string): Promise<Location[]> {
  const locations = await db.location.findMany({
    where: {
      city: {
        search
      }
    }
  })
  return locations.map(dbLocationToLocation)
}

async function findCities(country = 'pt'): Promise<Location[]> {
  const locations = await db.location.findMany({
    where: {
      country
    },
    orderBy: {
      city: 'asc'
    }
  })
  return locations.map(dbLocationToLocation)
}

async function countGroups(): Promise<number> {
  const [{ total }] = (await db.$queryRaw`
      SELECT COUNT(1) as total
      FROM groups
      WHERE status NOT IN ('deleted', 'auto')
  `) as Array<{ total: number }>

  return total
}

async function findNearestGroups(
  lat: number,
  lng: number,
  spirit: number[] | null,
  sport: number | null,
  dayOfWeek: number | null,
  timeOfDay: [number, number] | null,
  chunkSize = 40,
  position = 0
) {
  const n = (a: any | null, b: string) => (a === null ? '' : b)
  const s = (a: number[] | null): number[] => (a ? a : [])
  const [b, e] = s(timeOfDay)
  console.log(spirit, sport, dayOfWeek, timeOfDay)
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
               WHERE 1 = 1
                   ${n(spirit, `AND gs.id IN (${s(spirit).join(', ')})`)}
                   ${n(sport, `AND g.sport_id = ${sport}`)}
                   ${n(dayOfWeek, `AND g.day_of_week = ${dayOfWeek}`)}
                   ${n(timeOfDay, `AND g.time_of_day BETWEEN ${b} AND ${e}`)}
               ORDER BY 1
           ) x
      LIMIT ${chunkSize} OFFSET ${position * chunkSize}
  `
  console.log('----->', query)
  const results: Array<DBRawGroup> = await db.$queryRawUnsafe(query)
  return results.map(dbRawGroupToGroup)
}

export { countGroups, findCities, findCity, findNearestGroups }
