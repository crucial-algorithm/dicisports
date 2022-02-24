import { db } from '~/server/db.server'
import { DBRawGroup, Location } from '~/types'
import {
  dbLocationToLocation,
  dbRawGroupToGroup
} from '~/server/db/codecs.server'

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
  chunkSize = 40,
  position = 0
) {
  const results: Array<DBRawGroup> = await db.$queryRaw`
    SELECT * FROM (
                      SELECT (6357.0 *
                              acos(LEAST(cos(radians(${lat})) * cos(radians(lat)) * cos(radians(lng) - radians(${lng})) +
                                   sin(radians(${lat})) * sin(radians(lat)), 1))) AS distance,
                             g.*,
                             u.name                                           AS "user_name",
                             gs.name                                          AS "group_spirit"
                      FROM groups g
                               INNER JOIN users u ON g.created_by = u.id
                               INNER JOIN groups_spirit gs on g.group_spirit_id = gs.id
                      ORDER BY 1
                  ) x
    LIMIT ${chunkSize} OFFSET ${position * chunkSize}
  `
  return results.map(dbRawGroupToGroup)
}

export { countGroups, findCities, findCity, findNearestGroups }
