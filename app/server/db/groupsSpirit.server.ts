import type { GroupSpirit } from '~/types';
import { db } from '~/server/db.server';
import { dbGroupSpiritToGroupSpirit } from '~/server/db/codecs.server';

async function findGroupsSpirit(): Promise<Array<GroupSpirit>> {
  const groupTypes = await db.groupSpirit.findMany({
    orderBy: {
      id: 'asc'
    }
  });

  return groupTypes.map(dbGroupSpiritToGroupSpirit);
}

export { findGroupsSpirit };
