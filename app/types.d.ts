import type { PaymentMethod } from '@prisma/client';
import type {
  Booking as DBBooking,
  Difficulty as DBDifficulty,
  DiscountCode as DBDiscountCode,
  Document as DBDocument,
  Event as DBEvent,
  Group as DBGroup,
  GroupSchedule as DBGroupSchedule,
  GroupSpirit as DBGroupSpirit,
  GroupType as DBGroupType,
  Organiser as DBOrganiser,
  Participant as DBParticipant,
  ParticipantStatus,
  Perk as DBPerk,
  Race as DBRace,
  RaceParticipant as DBRaceParticipant,
  ShirtSize as DBShirtSize,
  Sport as DBSport,
  Status as EventStatus,
  User as DBUser,
  Status
} from '@prisma/client';

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

type User = { organiser?: Organiser | null } & Omit<DBUser, 'password' | 'salt'>;
type Sport = {
  name: TranslationObject;
} & DBSport;
type Document = {} & DBDocument;
type CreateDocumentInput = {
  id: string;
  label: string;
  path?: string | null;
  eventId: string;
};

type GroupType = {
  name: TranslationObject;
} & DBGroupType;

type GroupInput = {
  groupSpirit?: DBGroupSpirit | undefined;
  groupType?: DBGroupType | undefined;
  sport?: DBSport | undefined | null;
  createdBy?: User | DBUser;
  description: string | null;
} & DBGroup;

type Event = {
  races: Race[];
  difficulty: Difficulty | null;
  documents: Document[];
  status: EventStatus;
} & DBEvent;

type CreateEventInput = {
  id: string;
  name: string;
  slug?: string;
  sportId: number;
  difficultyId: number;
  startAt: Date | string;
  lat: number | null;
  lng: number | null;
  location: string | null;
  useExternalBooking: boolean;
  externalBookingUrl?: string | null;
  description?: string | null;
  directions: string | null;
  image1?: string | null;
  image2?: string | null;
  image3?: string | null;
  image4?: string | null;
  image5?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  regulationPath: string | null;
  regulationContent: string | null;
  regulationFileName: string | null;
  status?: EventStatus;
};

type Perk = {} & DBPerk;

type CreatePerksInput = {
  id?: string;
  name: string;
  createdAt?: Date | string;
  isDefault: boolean;
  isEnabled: boolean;
  eventId: string;
};

type Race = {} & DBRace;

type CreateRaceInput = {
  id: string | null;
  name: string;
  distance: number;
  createdAt?: Date;
  updatedAt?: Date;
  startTime: number;
  elevationGain: number;
  elevationLoss?: number | null;
  price: number;
  priceEarlyBird?: number | null;
  validUntil?: Date | null;
  raceDescription?: string | null;
  displayOrder?: number | null;
  eventId: string;
  track: string | null;
};

type GroupSpirit = {
  name: TranslationObject;
} & DBGroupSpirit;

type DBRawGroup = {
  distance: number;
  id: string;
  name: string;
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
  status: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  user_name: string;
  group_spirit: TranslationObject;
  records: number;
  schedules: string[];
};

type DBRawSearchResults = {
  entity: string;
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

type SearchResults = {
  entity: string;
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
  id?: string;
  dayOfWeek: number;
  timeOfDay: number;
  hour?: number;
  minute?: number;
  groupId: string;
} & DBGroupSchedule;

type CreateScheduleInput = {
  id?: string;
  dayOfWeek: number;
  timeOfDay: number;
  groupId: string;
};

type CreateGroupInput = {
  id?: string;
  name: string;
  slug?: string;
  sportId?: number | null;
  groupTypeId: number;
  groupSpiritId: number;
  lat: number;
  lng: number;
  location: string;
  near: string;
  dayOfWeek: number;
  timeOfDay: number;
  whatsapp?: string | null;
  image1?: string | null;
  image2?: string | null;
  image3?: string | null;
  createdAt?: Date | string;
  createdById?: string;
  updatedAt?: Date | string;
};

type GroupFilters = {
  spirit: number[] | null;
  sport: number | null;
  dayOfWeek: number | null;
  timeOfDay: [number, number] | null;
};

type LoginAction = null | 'login' | 'ws' | 'favorite';

type FavoriteEvent = {
  userId: string;
  eventId: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type Difficulty = {
  name: TranslationObject;
} & DBDifficulty;

type Ticket = {
  race: Race;
  numberOfTickets: number;
};

type PartialCart = {
  id: string;
  raceId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

type DBRawCart = {
  id: string;
  race_id: string;
  user_id: string;
  qty: number;
  created_at: Date;
  updated_at: Date;
};

type UICartRow = {
  id: string;
  raceId: string;
  qty: number;
  name: string;
  price: number;
  order: number;
  distance: number;
  startTime: number;
};

type DBRawUICartRow = {
  id: string;
  race_id: string;
  name: string;
  price: number;
  distance: number;
  start_time: number;
  display_order: number;
  qty: number;
};

type DBRawRaceQty = {
  id: string;
  name: string;
  distance: number;
  start_time: number;
  price: number;
  display_order: number;
  qty: number;
};

type RaceQty = {
  id: string;
  name: string;
  distance: number;
  startTime: number;
  price: number;
  displayOrder: number;
  qty: number;
};

type RaceParticipant = {
  race: Race;
  participant: Participant;
  booking?: Booking;
} & DBRaceParticipant;

type RaceParticipantInput = {
  id?: string;
  participantId: string;
  raceId: string;
  bookingId: string;
  createdAt: Date;
  updatedAt: Date;
};

type UIRaceParticipant = {
  id: string;
  name: string;
  birthdate: Date;
  gender: string;
  bookingAt: Date;
  status: string;
  raceName: string;
};

type DBRawUIRaceParticipant = {
  id: string;
  name: string;
  birthdate: Date;
  gender: string;
  booking_at: Date;
  status: string;
  race_name: string;
  records: number;
};

type Participant = {} & DBParticipant;

type ParticipantInput = {
  id: string;
  userId?: string | null;
  firstName: string;
  lastName: string;
  gender: string;
  birthdate: Date;
  phoneNumber: number;
  identityCard?: string | null;
  federationNumber?: number | null;
  shirtSize: number;
  nationality?: number | null;
  postalCode: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type DBRawParticipant = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  gender: string;
  birthdate: Date;
  phone_number: number;
  identity_card: string | null;
  federation_number: number | null;
  shirt_size: number;
  nationality: number | null;
  postal_code: string;
  status: ParticipantStatus;
  created_at: Date;
  updated_at: Date;
};

type Booking = {} & DBBooking;

type BookingList = {
  id: string;
  eventName: string;
  bookingDate: Date;
  status: string;
  pin: number;
  totalParticipants: number;
};

type DBRawBookingList = {
  id: string;
  event_name: string;
  booking_date: Date;
  status: string;
  total_participants: number;
  pin: number;
  records: number;
};

type ShirtSize = {} & DBShirtSize;

type RaceRevenueRegistrations = {
  id: string;
  name: string;
  registrations: number;
  revenue: number;
};

type SearchEventsResults = {
  name: string;
  slug: string;
  image1?: string;
  image2?: string;
  image3?: string;
  image4?: string;
  image5?: string;
};

type Organiser = DBOrganiser & {};

type OrganiserInput = {
  // id will be null if the user has no organiser profile and is creating it
  id: string | null;
  name: string;
  email: string;
  phoneNumber?: number | null;
  address: string;
  postalCode: string;
  city: string;
  description: string;
  logo: string;
  userId: string;
};

type DiscountCode = DBDiscountCode & {};

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
  // entities
  User,
  Group,
  GroupInput,
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
  LoginAction,
  FavoriteEvent,
  Difficulty,
  Ticket,
  UICartRow,
  DBRawUICartRow,
  DBRawRaceQty,
  RaceQty,
  DBRawCart,
  RaceParticipant,
  RaceParticipantInput,
  DBRawUIRaceParticipant,
  UIRaceParticipant,
  PartialCart,
  Participant,
  ParticipantInput,
  DBRawParticipant,
  Booking,
  ShirtSize,
  RaceRevenueRegistrations,
  DBRawSearchResults,
  SearchResults,
  SearchEventsResults,
  Organiser,
  OrganiserInput,
  EventStatus,
  BookingList,
  DBRawBookingList,
  DiscountCode,
  SibsWebHookSchema,
  SibsStatusResponse
};

// https://www.i18next.com/overview/typescript#argument-of-type-defaulttfuncreturn-is-not-assignable-to-parameter-of-type-xyz
declare module 'i18next' {
  interface CustomTypeOptions {
    returnNull: false;
  }
}
