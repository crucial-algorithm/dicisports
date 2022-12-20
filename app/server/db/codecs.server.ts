import type {
  Difficulty as DBDifficulty,
  GroupSpirit as DBGroupSpirit,
  GroupType as DBGroupType,
  Perk as DBPerk,
  Sport as DBSport,
  Status
} from '@prisma/client';
import { Role } from '@prisma/client';

import type {
  Cart,
  DaysOfWeek,
  DBRawCart,
  DBRawGroup,
  DBRawRaceCheckout,
  DBRawRaceQtd,
  Difficulty,
  Group,
  GroupInput,
  GroupSpirit,
  GroupType,
  Perk,
  RaceCheckout,
  RaceQtd,
  Sport,
  TranslationObject
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

function dbCartToCart(cart: DBRawCart): Cart {
  return {
    id: cart.checkout_id,
    qtd: cart.qtd,
    raceName: cart.race_name,
    racePrice: cart.race_price,
    displayOrder: cart.display_order
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

function dbRaceCheckoutToRaceCheckout(
  raceCheckout: DBRawRaceCheckout
): Partial<RaceCheckout> {
  return {
    id: raceCheckout.id,
    raceId: raceCheckout.race_id,
    userId: raceCheckout.user_id,
    createdAt: raceCheckout.created_at,
    updatedAt: raceCheckout.updated_at
  };
}

export {
  dbSportToSport,
  dbGroupSpiritToGroupSpirit,
  dbGroupTypeToGroupType,
  dbGroupToGroup,
  dbPerkToPerk,
  dbRawGroupToGroup,
  dbDifficultyToDifficulty,
  dbCartToCart,
  dbEventRaceCheckoutQtdToEventRaceCheckoutQtd,
  dbRaceCheckoutToRaceCheckout
};
