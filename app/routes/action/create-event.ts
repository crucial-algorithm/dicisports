import type { ActionFunction } from '@remix-run/node';
import { $Enums } from '@prisma/client';

import { z } from 'zod';

import type { Language } from '~/types';

import Id from '~/server/utils/Id.server';
import {
  createDraftEvent,
  publishEvent,
  updateEvent
} from '~/server/db/events.server';
import { BadRequest, InternalServerError } from '~/server/utils/misc';
import Config from '~/server/config.server';

import defaultPerks from '~/server/db/perks.json';
import {
  enableEventPerks,
  findEventPerks,
  findEventPerksByPerksName
} from '~/server/db/perks.server';
import { createRaces } from '~/server/db/races.server';

const PerksSchema = z.object({
  photos: z.boolean(),
  prizes: z.boolean(),
  shower: z.boolean(),
  support: z.boolean(),
  // ignored: all events must have insurance by default (potentially confusing filter)
  insurance: z.boolean(),
  food_stations: z.boolean(),
  participant_kit: z.boolean()
});

type PerksRequestType = z.infer<typeof PerksSchema>;

const RacesSchema = z
  .object({
    name: z.string(),
    distance: z.number().nullable(),
    elevationGain: z.number().nullable(),
    price: z.number(),
    raceDescription: z.string().nullable(),
    track: z.string().nullable(),
    startTime: z.number().nullable()
  })
  .array();

const LocationSchema = z.object({
  startPoint: z.string().nullable(),
  city: z.optional(z.string().nullable()),
  country: z.optional(z.string().nullable()),
  region: z.optional(z.string().nullable()),
  zipcode: z.optional(z.string().nullable())
});

export const action: ActionFunction = async ({ request }) => {
  const json = await request.json();
  const { token, user, language, data: uncheckedData } = json;

  // Check token against environment variable
  if (!token || token !== Config().CREATE_EVENT_TOKEN) {
    return BadRequest('Invalid token');
  }

  if (!user) {
    return BadRequest('Invalid user');
  }

  const EventSchema = z
    .object({
      name: z
        .string({ required_error: 'Required' })
        .min(5, { message: 'Min 5 chars' }),
      sportId: z
        .number()
        .nonnegative({ message: 'Nonexistent Sport' })
        .lte(8, { message: 'Nonexistent Sport' }),
      difficultyId: z
        .number()
        .nonnegative({ message: 'Nonexistent Difficulty' })
        .lte(3, { message: 'Nonexistent Difficulty' }),
      startAt: z
        .date({
          required_error: 'Required',
          invalid_type_error: 'Invalid Date Format'
        })
        .min(new Date(), { message: 'Future Date' }),
      placeName: z.string({
        required_error: 'Required',
        invalid_type_error: 'Required'
      }),
      useExternalBooking: z.boolean({
        invalid_type_error: 'Invalid Type'
      }),
      description: z
        .string({
          invalid_type_error: 'Invalid Type',
          required_error: 'Required'
        })
        .min(1, { message: 'Min 1 chars' })
        .nullable(),
      bibStartingNumber: z
        .number()
        .int({ message: 'Must be int' })
        .nonnegative({ message: 'Positive number' }),
      races: RacesSchema,
      regulationPath: z.string().nullable(),
      regulationContent: z.string().nullable(),
      externalWebsite: z.string().url('External Website Url Error').nullable(),
      perks: PerksSchema,
      lat: z.number(),
      lng: z.number(),
      image1: z.optional(z.string().nullable()),
      image2: z.optional(z.string().nullable()),
      image3: z.optional(z.string().nullable()),
      image4: z.optional(z.string().nullable()),
      image5: z.optional(z.string().nullable()),
      directions: z.optional(z.string().nullable()),
      location: LocationSchema,
      organizer: z.optional(z.string().nullable())
    })
    .and(
      z.object(
        uncheckedData.useExternalBooking
          ? {
              externalBookingUrl: z
                .string({ invalid_type_error: 'Invalid URL' })
                .url({ message: 'Invalid URL' })
            }
          : {}
      )
    )
    .and(
      z.object(
        uncheckedData.useExternalBooking
          ? {}
          : {
              bookingStopsAt: z
                .date({
                  required_error: 'Required',
                  invalid_type_error: 'Invalid Date Format'
                })
                .max(
                  uncheckedData.startAt
                    ? new Date(uncheckedData.startAt)
                    : new Date('2100-12-31'),
                  'Date Limit = to event start date'
                )
            }
      )
    )
    .refine(
      (s) =>
        (s.regulationPath === null &&
          s.regulationContent &&
          s?.regulationContent?.length > 1) ||
        (s.regulationPath &&
          s?.regulationPath?.length > 1 &&
          s.regulationContent === null),
      {
        message: 'Add Regulation',
        path: ['regulation']
      }
    );

  try {
    console.log('----> Event: ', uncheckedData.races);
    EventSchema.parse({
      ...uncheckedData,
      startAt: uncheckedData.startAt ? new Date(uncheckedData.startAt) : null
    });
  } catch (err) {
    // console.error(err);
    return BadRequest(
      err.errors
        .map(
          ({ message, code, path }) =>
            `[${path.join(',')}]: ${code}, ${message}`
        )
        .join('\n')
    );
  }

  type EventRequestType = z.infer<typeof EventSchema>;

  const checkedData: EventRequestType = uncheckedData;

  const lang = (String(language) || 'pt') as Language;
  const eventId = Id();

  const updateEventInput = {
    id: eventId,
    name: checkedData.name,
    sportId: checkedData.sportId,
    difficultyId: checkedData.difficultyId,
    startAt: checkedData.startAt,
    lat: checkedData.lat,
    lng: checkedData.lng,
    // example from dici db: {"place": "Monção", "coords": "42.07984974673485,-8.474487249608813", "region": "Viana do Castelo", "address": "Rua Das Termas, 4950-478 Monção, Viana do Castelo, Portugal", "country": "Portugal", "postcode": "4950-478", "shortAddress": "Rua Das Termas"}
    location: {
      coords: `${checkedData.lat},${checkedData.lng}`,
      place: checkedData.location.city, // used in formatting
      region: checkedData.location.region, // used in formatting (everything after not used)
      address: checkedData.location.startPoint,
      country: checkedData.location.country,
      postcode: checkedData.location.zipcode,
      shortAddress: checkedData.placeName
    },
    placeName: checkedData.placeName,
    useExternalBooking: checkedData.useExternalBooking,
    bookingStopsAt: checkedData.bookingStopsAt,
    externalBookingUrl: checkedData.externalBookingUrl,
    description: checkedData.description,
    directions: checkedData.directions,
    bibStartingNumber: checkedData.bibStartingNumber,
    image1: checkedData.image1,
    image2: checkedData.image2,
    image3: checkedData.image3,
    image4: checkedData.image4,
    image5: checkedData.image5,
    externalWebsite: checkedData.externalWebsite,
    regulationPath: checkedData.regulationPath,
    regulationContent: checkedData.regulationContent,
    regulationFileName: null,
    status: $Enums.Status.draft,
    isScraped: true,
    organizer: checkedData.organizer
  };

  try {
    await createDraftEvent(user, lang, eventId);
    const perks = await findEventPerks(eventId);

    await updateEvent(
      updateEventInput,
      perks.map(({ id }) => id),
      /* newPerks = */ [] // intentionally empty
    );

    await createRaces(
      checkedData.races.map((r) => ({
        ...r,
        name: r.name || checkedData.name,
        distance: r.distance || 0,
        eventId,
        startTime: r.startTime || 900,
        elevationGain: r.elevationGain || 0,
        price: r.price || 0
      }))
    );
    await handlePerks(eventId, checkedData.perks, lang); // override perk enabled/disable status
    await publishEvent(eventId, checkedData.name);
  } catch (err) {
    console.error(err);
    return InternalServerError(String(err));
  }

  return new Response(eventId, { status: 200 });
};

async function handlePerks(
  eventId: string,
  perks: PerksRequestType,
  language: Language
) {
  const names: string[] = [];

  for (const perkKey of Object.keys(perks)) {
    const isEnabled = perks[perkKey];

    if (!isEnabled) {
      continue;
    }

    const perk = defaultPerks.find((p) => p.key === perkKey);

    if (!perk) {
      throw new Error(`Perk ${perkKey} not found`);
    }

    names.push(perk.name[language]);
  }

  const dbPerks = await findEventPerksByPerksName(eventId, names);

  await enableEventPerks(dbPerks.map((p) => p.id));
}
