import { Group as DBGroup, User as DBUser, GroupSpirit as DBGroupSpirit, Sport as DBSport } from '@prisma/client'

type NonNullProperties<Type> = {
  [Key in keyof Type]-?: Exclude<Type[Key], null | undefined>
}

type MemberProfile = {
  email: string
  name?: string
  avatar?: string
}

type Await<Type> = Type extends Promise<infer Value>
  ? Await<Value>
  : Type

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
  en: 'en'
}

export const DaysOfWeekMap: {
  6: 'Sunday'
  0: 'Monday'
  1: 'Tuesday'
  2: 'Wednesday'
  3: 'Thursday'
  4: 'Friday'
  5: 'Saturday'
}

type DaysOfWeek = keyof typeof DaysOfWeekMap

type Language = typeof AvailableLanguages[keyof typeof AvailableLanguages]

// eslint-disable-next-line no-unused-vars
type TranslationObject = { [K in Language]: string }

type User = {} & DBUser
type Sport = {} & DBSport
type GroupSpirit = {
  name: TranslationObject
} & DBGroupSpirit

type Group = {
  dayOfWeek: DaysOfWeek
  createdBy?: User
  groupSpirit?: GroupSpirit
} & DBGroup

export {
  NonNullProperties,
  MemberProfile,
  Await,
  KCDSitemapEntry,
  KCDHandle,
  Language,
  TranslationObject,
  DaysOfWeek,
  // entities
  User,
  Group,
  GroupSpirit,
  Sport
}
