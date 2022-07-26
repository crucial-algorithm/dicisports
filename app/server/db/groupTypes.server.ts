import type { GroupType } from '~/types';
import { db } from '~/server/db.server';
import { dbGroupTypeToGroupType } from '~/server/db/codecs.server';

async function findGroupTypes(): Promise<Array<GroupType>> {
  const groupTypes = await db.groupType.findMany({
    orderBy: {
      id: 'asc'
    }
  });

  return groupTypes.map((gt) => dbGroupTypeToGroupType(gt));
}

export { findGroupTypes };
