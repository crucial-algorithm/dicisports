import {
  DaysOfWeek,
  Group,
  GroupSpirit,
  GroupType,
  TranslationObject,
  User,
  Sport
} from '~/types'
import {
  Group as DBGroup,
  GroupType as DBGroupType,
  GroupSpirit as DBGroupSpirit,
  Sport as DBSport
} from '@prisma/client'

function dbSportToSport(sport: DBSport): Sport {
  const { id, name, createdAt, updatedAt } = sport
  return {
    id,
    createdAt,
    updatedAt,
    name: name as TranslationObject
  }
}

function dbGroupSpiritToGroupSpirit(group: DBGroupSpirit): GroupSpirit {
  const { id, name, createdAt, updatedAt } = group
  return {
    id,
    createdAt,
    updatedAt,
    name: name as TranslationObject
  }
}

function dbGroupTypeToGroupType(group: DBGroupType): GroupType {
  const { id, name, createdAt, updatedAt } = group
  return {
    id,
    createdAt,
    updatedAt,
    name: name as TranslationObject
  }
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
  }
}

export {
  dbSportToSport,
  dbGroupSpiritToGroupSpirit,
  dbGroupTypeToGroupType,
  dbGroupToGroup
}
