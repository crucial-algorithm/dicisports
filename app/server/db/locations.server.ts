import { db } from '~/server/db.server'
import { DBRawGroup, Location } from '~/types'
import {
  dbLocationToLocation,
  dbRawGroupToGroup
} from '~/server/db/codecs.server'

async function findCity(search: string): Promise<Array<Location>> {
  const locations = await db.location.findMany({
    where: {
      city: {
        search
      }
    }
  })
  return locations.map(dbLocationToLocation)
}

async function findNearestGroups(
  lat: number,
  lng: number,
  chunkSize = 40,
  position = 0
) {
  const results: Array<DBRawGroup> = await db.$queryRaw`
    SELECT * FROM (
                      SELECT (6370.0 *
                              acos(cos(radians(${lat})) * cos(radians(lat)) * cos(radians(lng) - radians(${lng})) +
                                   sin(radians(${lat})) * sin(radians(lat)))) AS distance,
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

export { findCity, findNearestGroups }
