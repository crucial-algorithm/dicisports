import type {
  Difficulty as DBDifficulty,
  DiscountCode as DBDiscountCode,
  GroupSpirit as DBGroupSpirit,
  GroupType as DBGroupType,
  OrganizerType as DBOrganizerType,
  Perk as DBPerk,
  ShirtSize as DBShirtSize,
  Sport as DBSport,
  Status,
  User as DBUser
} from '@prisma/client';
import { Role } from '@prisma/client';

import type {
  DaysOfWeek,
  DBRawSearchResults,
  Difficulty,
  DiscountCode,
  Group,
  GroupInput,
  GroupSpirit,
  GroupType,
  OrganizerType,
  Perk,
  SearchResults,
  ShirtSize,
  Sport,
  TranslationObject,
  User
} from '~/types';

function dbUserToUser(user: DBUser | User): User {
  if ('organizer' in user) {
    const { id, name, email, lat, lng, location, role, createdAt, updatedAt, organizer } = user as User;

    return { id, name, email, lat, lng, location, role, createdAt, updatedAt, organizer };
  }

  const { id, name, email, lat, lng, location, role, createdAt, updatedAt } = user;

  return { id, name, email, lat, lng, location, role, createdAt, updatedAt };
}

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

function dbDifficultyToDifficulty(difficulty: DBDifficulty): Difficulty {
  const { id, name, description, createdAt, updatedAt } = difficulty;

  return {
    id,
    createdAt,
    updatedAt,
    name: name as TranslationObject,
    description: description as TranslationObject
  };
}

function dbPerkToPerk(perk: DBPerk): Perk {
  const { id, name, createdAt, isDefault, isEnabled, eventId, displayOrder } =
    perk;

  return {
    id,
    name,
    createdAt: new Date(createdAt),
    isDefault,
    isEnabled,
    eventId,
    displayOrder
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

function dbShirtSizeToShirtSize(shirt: DBShirtSize): ShirtSize {
  const { id, name, createdAt, updatedAt } = shirt;

  return {
    id,
    name: name as TranslationObject,
    createdAt,
    updatedAt
  };
}

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

function dbRawSearchResultsToSearchResults(results: DBRawSearchResults): SearchResults {
  return {
    entity: results.entity,
    distance: results.distance,
    id: results.id,
    name: results.name,
    minPrice: results.min_price,
    difficulty: results.difficulty,
    startAt: new Date(results.start_at),
    description: results.description,
    slug: results.slug,
    sportId: results.sport_id,
    groupTypeId: results.group_type_id,
    groupSpiritId: results.group_spirit_id,
    lat: results.lat,
    lng: results.lng,
    location: results.location,
    near: results.near,
    dayOfWeek: results.day_of_week as DaysOfWeek,
    timeOfDay: results.time_of_day,
    whatsapp: results.whatsapp,
    image1: results.image1,
    image2: results.image2,
    image3: results.image3,
    image4: results.image4,
    image5: results.image5,
    status: results.status as Status,
    createdAt: new Date(results.created_at),
    createdById: results.created_by,
    updatedAt: new Date(results.updated_at),
    groupSpirit: {
      id: 0,
      name: results.group_spirit,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    createdBy: {
      id: results.created_by,
      name: results.user_name,
      createdAt: new Date(),
      updatedAt: new Date(),
      lat: 0,
      lng: 0,
      location: '',
      email: '',
      role: Role.MEMBER
    },
    schedules: results.schedules !== null && results.schedules.length ? results.schedules.map((s) => {
      const [id, day, hour] = s.split(':').map(String);

      return {
        timeOfDay: Number(hour),
        dayOfWeek: Number(day),
        groupId: results.id,
        id
      };
    }) : null
  };
}

function dbDiscountCodeToDiscountCode(discountCode: DBDiscountCode): DiscountCode {
  const { id, code, value, fixed, createdById, organizerId, status, createdAt, updatedAt  } = discountCode;

  return { id, code, value, fixed, createdById, organizerId, status, createdAt, updatedAt };
}

function dbOrganizerTypeToOrganizerType(
  organizerType: DBOrganizerType
): OrganizerType {
  const { id, name, createdAt, updatedAt } = organizerType;

  return {
    id,
    name: name as TranslationObject,
    createdAt,
    updatedAt
  };
}

export {
  dbUserToUser,
  dbSportToSport,
  dbGroupSpiritToGroupSpirit,
  dbGroupTypeToGroupType,
  dbGroupToGroup,
  dbPerkToPerk,
  dbDifficultyToDifficulty,
  dbShirtSizeToShirtSize,
  dbRawSearchResultsToSearchResults,
  dbDiscountCodeToDiscountCode,
  dbOrganizerTypeToOrganizerType
};
