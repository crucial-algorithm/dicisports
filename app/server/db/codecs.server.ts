import type {
  Difficulty as DBDifficulty,
  GroupSpirit as DBGroupSpirit,
  GroupType as DBGroupType,
  Perk as DBPerk,
  ShirtSize as DBShirtSize,
  Sport as DBSport,
  Status,
  User as DBUser
} from '@prisma/client';
import { Role } from '@prisma/client';

import type {
  BookingList,
  DaysOfWeek, DBRawBookingList,
  DBRawCart,
  DBRawGroup,
  DBRawParticipant,
  DBRawRaceQtd, DBRawSearchResults,
  DBRawUICartRow,
  DBRawUIRaceParticipant,
  Difficulty,
  Group,
  GroupInput,
  GroupSpirit,
  GroupType,
  PartialCart,
  Participant,
  Perk,
  RaceQtd, SearchResults,
  ShirtSize,
  Sport,
  TranslationObject,
  UICartRow,
  UIRaceParticipant,
  User
} from '~/types';

function dbUserToUser(user: DBUser | User): User {
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
  const { id, name, createdAt, updatedAt } = difficulty;

  return {
    id,
    createdAt,
    updatedAt,
    name: name as TranslationObject
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

function dbRawGroupToGroup(group: DBRawGroup): Group {
  return {
    distance: group.distance,
    id: group.id,
    name: group.name,
    description: group.description,
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
      lat: 0,
      lng: 0,
      location: '',
      email: '',
      role: Role.MEMBER
    },
    schedules: group.schedules.map((s) => {
      const [id, day, hour] = s.split(':').map(String);

      return {
        timeOfDay: Number(hour),
        dayOfWeek: Number(day),
        groupId: group.id,
        id
      };
    })
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

function dbUICartToUICart(cart: DBRawUICartRow): UICartRow {
  return {
    id: cart.id,
    raceId: cart.race_id,
    name: cart.name,
    price: cart.price,
    distance: cart.distance,
    startTime: cart.start_time,
    order: cart.display_order,
    qtd: Number(cart.qtd)
  };
}

function dbUIRaceParticipantToUIRaceParticipant(
  raceParticipant: DBRawUIRaceParticipant
): UIRaceParticipant {
  return {
    id: raceParticipant.id,
    name: raceParticipant.name,
    birthdate: raceParticipant.birthdate,
    gender: raceParticipant.gender,
    bookingAt: raceParticipant.booking_at,
    status: raceParticipant.status,
    raceName: raceParticipant.race_name
  };
}

function dbEventRaceCheckoutQtdToEventRaceCheckoutQtd(
  race: DBRawRaceQtd
): RaceQtd {
  return {
    id: race.id,
    name: race.name,
    distance: race.distance,
    startTime: race.start_time,
    price: race.price,
    displayOrder: race.display_order,
    qtd: race.qtd
  };
}

function dbCartToCart(cart: DBRawCart): PartialCart {
  return {
    id: cart.id,
    raceId: cart.race_id,
    userId: cart.user_id,
    createdAt: cart.created_at,
    updatedAt: cart.updated_at
  };
}

function dbParticipantToParticipant(
  participant: DBRawParticipant
): Participant {
  return {
    id: participant.id,
    userId: participant.user_id,
    firstName: participant.first_name,
    lastName: participant.last_name,
    gender: participant.gender,
    birthdate: participant.birthdate,
    phoneNumber: participant.phone_number,
    identityCard: participant.identity_card,
    federationNumber: participant.federation_number,
    shirtSize: participant.shirt_size,
    nationality: participant.nationality,
    postalCode: participant.postal_code,
    status: participant.status,
    createdAt: participant.created_at,
    updatedAt: participant.updated_at
  };
}

function dbRawBookingListToBookingList(
  bookingList: DBRawBookingList
): BookingList {
  return {
    id: bookingList.id,
    eventName: bookingList.event_name,
    bookingDate: bookingList.booking_date,
    status: bookingList.status,
    totalParticipants: Number(bookingList.total_participants)
  };
}

export {
  dbUserToUser,
  dbSportToSport,
  dbGroupSpiritToGroupSpirit,
  dbGroupTypeToGroupType,
  dbGroupToGroup,
  dbPerkToPerk,
  dbRawGroupToGroup,
  dbDifficultyToDifficulty,
  dbUICartToUICart,
  dbEventRaceCheckoutQtdToEventRaceCheckoutQtd,
  dbCartToCart,
  dbShirtSizeToShirtSize,
  dbUIRaceParticipantToUIRaceParticipant,
  dbParticipantToParticipant,
  dbRawSearchResultsToSearchResults,
  dbRawBookingListToBookingList
};
