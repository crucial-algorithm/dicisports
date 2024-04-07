import type {
  Difficulty as DBDifficulty,
  Group as DBGroup,
  GroupSchedule as DBGroupSchedule,
  GroupSpirit as DBGroupSpirit,
  GroupType as DBGroupType,
  Organizer,
  OrganizerType as DBOrganizerType,
  PaymentMethod,
  Prisma,
  Sport as DBSport,
  Status as EventStatus,
  User as DBUser
} from '@prisma/client';

import type { findBookingCart, findUserBookingsList } from '~/server/db/booking.server';
import type { calculateRaceNMV } from '~/server/financials.server';
import type { findRaceParticipants } from '~/server/db/participant.server';

type NonNullProperties<Type> = {
  [Key in keyof Type]-?: Exclude<Type[Key], null | undefined>;
};

type MemberProfile = {
  email: string;
  name?: string;
  avatar?: string;
};

type Await<Type> = Type extends Promise<infer Value> ? Await<Value> : Type;

/** Kent C Dodds types copied when recreating login */

type SitemapEntry = {
  route: string;
  lastmod?: string;
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority?: 0.0 | 0.1 | 0.2 | 0.3 | 0.4 | 0.5 | 0.6 | 0.7 | 0.8 | 0.9 | 1.0;
};

type KCDHandle = {
  /** this just allows us to identify routes more directly rather than relying on pathnames */
  id?: string;
  /** this is here to allow us to disable scroll restoration until Remix gives us better control */
  restoreScroll?: false;
  getSitemapEntries?: (
    request: Request
  ) =>
    | Promise<Array<SitemapEntry | null> | null>
    | Array<SitemapEntry | null>
    | null;
};

export const AvailableLanguages: {
  pt: 'pt';
};

export const DaysOfWeekMap: {
  6: 'Sunday';
  0: 'Monday';
  1: 'Tuesday';
  2: 'Wednesday';
  3: 'Thursday';
  4: 'Friday';
  5: 'Saturday';
};

type DaysOfWeek = keyof typeof DaysOfWeekMap;

type Language = typeof AvailableLanguages[keyof typeof AvailableLanguages];

// eslint-disable-next-line no-unused-vars
type TranslationObject = { [K in Language]: string };

type DiciLocation = {
  coords: string;
  shortAddress: string;
  address?: string;
  postcode?: string | null;
  place?: string | null;
  region?: string | null;
  country?: string | null;
};

type UploadImageMeta = {
  name: string;
  file: File;
  value: string;
  timestamp: number;
  signature: string;
  apiKey: string;
};

type User = { organizer?: Organizer | null } & Omit<DBUser, 'password' | 'salt'>;

type Sport = {
  name: TranslationObject;
} & DBSport;

type GroupType = {
  name: TranslationObject;
} & DBGroupType;

type CreateEventInput = Prisma.EventUncheckedCreateInput;

type CreatePerksInput = Prisma.PerkUncheckedCreateInput;

type CreateRaceInput = Prisma.RaceUncheckedCreateInput;

type GroupSpirit = {
  name: TranslationObject;
} & DBGroupSpirit;

type DBRawSearchResults = {
  distance: number;
  id: string;
  name: string;
  min_price: number;
  difficulty: TranslationObject;
  start_at: string;
  description: string;
  slug: string;
  sport_id: number;
  group_type_id: number;
  group_spirit_id: number;
  lat: number;
  lng: number;
  location: string;
  near: string;
  day_of_week: number;
  time_of_day: number;
  whatsapp: string | null;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  image5: string | null;
  status: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  user_name: string;
  group_spirit: TranslationObject;
  records: number;
  schedules: string[];
};

type GroupSearchResult = {
  distance: number;
  id: string;
  name: string;
  minPrice: number | null;
  difficulty: TranslationObject | null;
  startAt: Date | null;
  description: string | null;
  slug: string;
  sportId: number;
  groupTypeId: number | null;
  groupSpiritId: number | null;
  lat: number;
  lng: number;
  location: string;
  near: string | null;
  dayOfWeek: DaysOfWeek | null;
  timeOfDay: number | null;
  whatsapp: string | null;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  image5: string | null;
  status: string | null;
  createdAt: Date;
  createdById: string;
  updatedAt: Date;
  groupSpirit?: GroupSpirit | null;
  createdBy: User;
  schedules: GroupSchedule[] | null;
};

type Group = {
  dayOfWeek: DaysOfWeek;
  createdBy?: User;
  groupSpirit?: GroupSpirit;
  groupType?: GroupType;
  sport?: Sport;
  distance?: number;
  description: string | null;
  schedules?: GroupSchedule[];
} & DBGroup;

type GroupSchedule = {
  hour?: number;
  minute?: number;
} & DBGroupSchedule;

type CreateScheduleInput = Prisma.GroupScheduleUncheckedCreateInput;

type CreateGroupInput = Prisma.GroupCreateInput;

type GroupFilters = {
  spirit: number[] | null;
  sport: number | null;
  dayOfWeek: number | null;
  timeOfDay: [number, number] | null;
};

type EventFilters = {
  sport: number | null;
  region: string | null;
  timedEvents: 'included' | 'excluded' | null
};

type LoginAction = null | 'login' | 'ws' | 'favorite';

type Difficulty = {
  name: TranslationObject;
  description: TranslationObject;
} & DBDifficulty;

type UICartRow = Prisma.PromiseReturnType<typeof findBookingCart>[0];

type RaceQty = {
  id: string;
  name: string;
  distance: number;
  startTime: number;
  price: number;
  displayOrder: number;
  qty: number;
};

type RaceParticipantInput = Prisma.RaceParticipantUncheckedCreateInput;

type UIRaceParticipant = Prisma.PromiseReturnType<
  typeof findRaceParticipants
>['results'][0];

// The findUserBookingsList function returns an object { results, total }.
// Accessing ['results'] retrieves the type from the results property, and [0] is used to treat it as a single object type instead of an array.
type BookingList = Prisma.PromiseReturnType<typeof findUserBookingsList>['results'][0];

type ParticipantInput = Prisma.ParticipantUncheckedCreateInput;

type RaceRevenueRegistrations = Prisma.PromiseReturnType<
  typeof calculateRaceNMV
>;

type OrganizerType = {
  name: TranslationObject;
} & DBOrganizerType;

type OrganizerInput = Prisma.OrganizerUncheckedCreateInput;

type DiscountCodeInput = Prisma.DiscountCodeUncheckedCreateInput;

type SibsWebHookSchema = {
  returnStatus: { statusMsg: string; statusCode: string };
  paymentStatus: 'Success' | 'Error' | 'Declined';
  paymentMethod: PaymentMethod;
  transactionID: string;
  amount: { currency: 'EUR'; value: number };
  merchant: { terminalId: number; merchantName: string; transactionId: string };
  paymentType: string;
  notificationID: string;
};

type SibsStatusResponse = {
  merchant: { terminalId: number; transactionId: string };
  transactionID: string;
  amount: { currency: 'EUR'; value: number };
  paymentType: string;
  paymentStatus: 'Success' | 'Error' | 'Declined';
  paymentReference: {
    entity: string;
    reference: string;
    paymentEntity: string;
    expireDate: string;
    amount: { value: string; currency: 'Eur' };
  };
  paymentMethod: PaymentMethod;
  returnStatus: {
    statusCode: '000' | string
  }
};

type ResponseFeedback = {
  severity: 'error' | 'success' | 'info' | 'warn';
  message: string;
};


type LocalStorageBookingMetaData = {
  loginCTASeen: boolean;
  confirmationEmailSent: boolean;
};

export {
  NonNullProperties,
  MemberProfile,
  Await,
  SitemapEntry,
  KCDHandle,
  Language,
  TranslationObject,
  DaysOfWeek,
  DiciLocation,
  UploadImageMeta,
  GroupFilters,
  EventFilters,
  // entities
  User,
  Group,
  CreateGroupInput,
  GroupType,
  GroupSpirit,
  GroupSchedule,
  CreateScheduleInput,
  Sport,
  CreateEventInput,
  CreatePerksInput,
  CreateRaceInput,
  LoginAction,
  Difficulty,
  UICartRow,
  RaceQty,
  RaceParticipantInput,
  UIRaceParticipant,
  ParticipantInput,
  RaceRevenueRegistrations,
  DBRawSearchResults,
  GroupSearchResult,
  OrganizerInput,
  EventStatus,
  DiscountCodeInput,
  SibsWebHookSchema,
  SibsStatusResponse,
  OrganizerType,
  ResponseFeedback,
  LocalStorageBookingMetaData,
  BookingList
};

// https://www.i18next.com/overview/typescript#argument-of-type-defaulttfuncreturn-is-not-assignable-to-parameter-of-type-xyz
declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
  }
}
