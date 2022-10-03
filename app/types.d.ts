import type {
  Group as DBGroup,
  User as DBUser,
  GroupSpirit as DBGroupSpirit,
  GroupType as DBGroupType,
  Sport as DBSport,
  Document as DBDocument,
  Event as DBEvent,
  Perk as DBPerk,
  Race as DBRace,
  GroupSchedule as DBGroupSchedule
} from '@prisma/client';

type NonNullProperties<Type> = {
  [Key in keyof Type]-?: Exclude<Type[Key], null | undefined>
}

type MemberProfile = {
  email: string
  name?: string
  avatar?: string
}

type Await<Type> = Type extends Promise<infer Value> ? Await<Value> : Type

/** Kent C Dodds types copied when recreating login */

type KCDSitemapEntry = {
  route: string
  lastmod?: string
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never'
  priority?: 0.0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0
}

type KCDHandle = {
  /** this just allows us to identify routes more directly rather than relying on pathnames */
  id?: string
  /** this is here to allow us to disable scroll restoration until Remix gives us better control */
  restoreScroll?: false
  getSitemapEntries?: (
    request: Request
  ) =>
    | Promise<Array<KCDSitemapEntry | null> | null>
    | Array<KCDSitemapEntry | null>
    | null
}

export const AvailableLanguages: {
  pt: 'pt'
};

export const DaysOfWeekMap: {
  6: 'Sunday'
  0: 'Monday'
  1: 'Tuesday'
  2: 'Wednesday'
  3: 'Thursday'
  4: 'Friday'
  5: 'Saturday'
};

type DaysOfWeek = keyof typeof DaysOfWeekMap

type Language = typeof AvailableLanguages[keyof typeof AvailableLanguages]

// eslint-disable-next-line no-unused-vars
type TranslationObject = { [K in Language]: string }

type DiciLocation = {
  coords: string
  shortAddress: string
  address?: string
  postcode?: string | null
  place?: string | null
  region?: string | null
  country?: string | null
}

type UploadImageMeta = {
  name: string
  file: File
  value: string
  timestamp: number
  signature: string
  apiKey: string
}

type User = {} & Omit<DBUser, 'password' | 'salt'>
type Sport = {
  name: TranslationObject
} & DBSport
type Document = {} & DBDocument
type CreateDocumentInput = {
  id: string
  label: string
  path: string
  eventId: string
}

type GroupType = {
  name: TranslationObject
} & DBGroupType


type Event = {} & DBEvent

type CreateEventInput = {
  id: string
  name: string
  sportId: number
  startAt: Date | string
  location: string
  address: string
  useExternalBooking: boolean
  externalBookingUrl?: string | null
  eventDescription?: string | null
  directions: string
  image1?: string | null
  image2?: string | null
  image3?: string | null
  image4?: string | null
  image5?: string | null
  createdAt?: Date | string
  updatedAt?: Date | string
}

type Perk = {} & DBPerk

type CreatePerksInput = {
  id?: string
  name: string
  createdAt?: Date | string
  isDefault: boolean
  isEnabled: boolean
  eventId: string
}

type Race = {} & DBRace

type CreateRaceInput = {
  id: string
  name: string
  distance: number
  createdAt?: Date
  updatedAt?: Date
  startTime: number
  elevationGain: number
  elevationLoss?: number | null
  price: number
  priceEarlyBird?: number | null
  validUntil?: Date | null
  raceDescription?: string | null
  displayOrder?: number | null
  eventId: string
}

type GroupSpirit = {
  name: TranslationObject
} & DBGroupSpirit

type DBRawGroup = {
  distance: number
  id: string
  name: string
  description: string;
  slug: string
  sport_id: number
  group_type_id: number
  group_spirit_id: number
  lat: number
  lng: number
  location: string
  near: string
  day_of_week: number
  time_of_day: number
  whatsapp: string | null
  image1: string | null
  image2: string | null
  image3: string | null
  status: string
  created_at: string
  created_by: string
  updated_at: string
  user_name: string
  group_spirit: TranslationObject
  records: number
  schedules: string[]
}

type Group = {
  dayOfWeek: DaysOfWeek
  createdBy?: User
  groupSpirit?: GroupSpirit
  groupType?: GroupType
  sport?: Sport
  distance?: number
  description?: string
  schedules?: GroupSchedule[]
} & DBGroup

type GroupSchedule = {
  id?: string
  dayOfWeek: number
  timeOfDay: number
  hour?: number
  minute?: number
  groupId: string
} & DBGroupSchedule

type CreateScheduleInput = {
  id?: string
  dayOfWeek: number
  timeOfDay: number
  groupId: string
}

type CreateGroupInput = {
  id?: string
  name: string
  slug?: string
  sportId?: number | null
  groupTypeId: number
  groupSpiritId: number
  lat: number
  lng: number
  location: string
  near: string
  dayOfWeek: number
  timeOfDay: number
  whatsapp?: string | null
  image1?: string | null
  image2?: string | null
  image3?: string | null
  createdAt?: Date | string
  createdById?: string
  updatedAt?: Date | string
}

type GroupFilters = {
  spirit: number[] | null
  sport: number | null
  dayOfWeek: number | null
  timeOfDay: [number, number] | null
}

type LoginAction = null | 'login' | 'ws' | 'favorite'

export {
  NonNullProperties,
  MemberProfile,
  Await,
  KCDSitemapEntry,
  KCDHandle,
  Language,
  TranslationObject,
  DaysOfWeek,
  DiciLocation,
  UploadImageMeta,
  GroupFilters,
  // entities
  User,
  Group,
  CreateGroupInput,
  GroupType,
  GroupSpirit,
  GroupSchedule,
  CreateScheduleInput,
  Sport,
  Document,
  Event,
  Perk,
  Race,
  CreateEventInput,
  CreatePerksInput,
  CreateRaceInput,
  CreateDocumentInput,
  DBRawGroup,
  LoginAction
};
