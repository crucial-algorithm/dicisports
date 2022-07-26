import type {
  Group as DBGroup,
  GroupType as DBGroupType,
  GroupSpirit as DBGroupSpirit,
  Sport as DBSport,
  Status } from '@prisma/client';
import {
  Role
} from '@prisma/client';

import type {
  DaysOfWeek,
  Group,
  GroupSpirit,
  GroupType,
  TranslationObject,
  User,
  Sport,
  DBRawGroup
} from '~/types';

function dbSportToSport(sport: DBSport): Sport {
  const { id, name, createdAt, updatedAt, picture } = sport;

  return {
    id,
    createdAt,
    updatedAt,
    name: name as TranslationObject,
    picture
  };
}

function dbGroupSpiritToGroupSpirit(group: DBGroupSpirit): GroupSpirit {
  const { id, name, createdAt, updatedAt } = group;

  return {
    id,
    createdAt,
    updatedAt,
    name: name as TranslationObject
  };
}

function dbGroupTypeToGroupType(group: DBGroupType): GroupType {
  const { id, name, createdAt, updatedAt } = group;

  return {
    id,
    createdAt,
    updatedAt,
    name: name as TranslationObject
  };
}

type GroupInput = {
  groupSpirit?: DBGroupSpirit | undefined
  groupType?: DBGroupType | undefined
  sport?: DBSport | undefined | null
  createdBy?: User
} & DBGroup

function dbGroupToGroup(group: GroupInput): Group {
  return {
    ...group,
    dayOfWeek: group.dayOfWeek as DaysOfWeek,
    groupSpirit: group.groupSpirit
      ? dbGroupSpiritToGroupSpirit(group.groupSpirit)
      : undefined,
    groupType: group.groupType
      ? dbGroupTypeToGroupType(group.groupType)
      : undefined,
    sport: group.sport ? dbSportToSport(group.sport) : undefined
  };
}

function dbRawGroupToGroup(group: DBRawGroup): Group {
  return {
    distance: group.distance,
    id: group.id,
    name: group.name,
    slug: group.slug,
    sportId: group.sport_id,
    groupTypeId: group.group_type_id,
    groupSpiritId: group.group_spirit_id,
    lat: group.lat,
    lng: group.lng,
    location: group.location,
    near: group.near,
    dayOfWeek: group.day_of_week as DaysOfWeek,
    timeOfDay: group.time_of_day,
    whatsapp: group.whatsapp,
    image1: group.image1,
    image2: group.image2,
    image3: group.image3,
    status: group.status as Status,
    createdAt: new Date(group.created_at),
    createdById: group.created_by,
    updatedAt: new Date(group.updated_at),
    groupSpirit: {
      id: 0,
      name: group.group_spirit,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    createdBy: {
      id: group.created_by,
      name: group.user_name,
      createdAt: new Date(),
      updatedAt: new Date(),
      email: '',
      role: Role.MEMBER
    }
  };
}

export {
  dbSportToSport,
  dbGroupSpiritToGroupSpirit,
  dbGroupTypeToGroupType,
  dbGroupToGroup,
  dbRawGroupToGroup
};
