import type {
  Difficulty as DBDifficulty,
  OrganizerType as DBOrganizerType,
  Sport as DBSport,
  User as DBUser
} from '@prisma/client';

import type {
  Difficulty,
  OrganizerType,
  Sport,
  TranslationObject,
  User
} from '~/types';

function dbUserToUser(user: DBUser | User): User {
  if ('organizer' in user) {
    const {
      id,
      name,
      email,
      lat,
      lng,
      location,
      role,
      createdAt,
      updatedAt,
      organizer
    } = user as User;

    return {
      id,
      name,
      email,
      lat,
      lng,
      location,
      role,
      createdAt,
      updatedAt,
      organizer
    };
  }

  const { id, name, email, lat, lng, location, role, createdAt, updatedAt } =
    user;

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
  dbDifficultyToDifficulty,
  dbOrganizerTypeToOrganizerType
};
