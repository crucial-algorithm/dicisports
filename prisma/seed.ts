import { PrismaClient } from '@prisma/client';

import perksSeed from './data/perks.json';
import groupsSeed from './data/groups.json';
import usersSeed from './data/users.json';
import racesSeed from './data/races.json';
import difficultiesSeed from './data/difficulties.json';
import favoriteGroupsSeed from './data/favoriteGroups.json';
import sessionsSeed from './data/sessions.json';
import documentsSeed from './data/documents.json';
import eventsSeed from './data/events.json';
import groupSpiritSeed from './data/groupSpirit.json';
import groupTypesSeed from './data/groupTypes.json';
import shirtSizesSeed from './data/shirtSizes.json';
import sportsSeed from './data/sports.json';
import bookingsSeed from './data/bookings.json';
import participantsSeed from './data/participants.json';
import raceParticipantsSeed from './data/raceParticipants.json';
import organizerSeed from './data/organizers.json';
import discountCodesSeed from './data/discountCodes.json';
import eventTeamsSeed from './data/eventTeams.json';
import latestBibNumberSeed from './data/latestBibNumber.json';
import paymentsSeed from './data/payments.json';
import organizerTypesSeed from './data/organizerTypes.json';
import mailingListSeed from './data/mailingList.json';

const db = new PrismaClient();
const now = new Date();

async function persist(name: string, data: Array<any>, entity: any) {
  return entity
    .createMany({
      data
    })
    .catch((err: { code: string }) => {
      if (err.code === 'P2002') {
        console.log(`${name} already in db. skipping...`);
        console.error(err);
        return;
      }
      console.error(`error seeding ${name}`, err);
    });
}

async function seed() {
  await persist('sports', sports(), db.sport);
  await persist('difficulties', difficulties(), db.difficulty);
  await persist('group types', groupTypes(), db.groupType);
  await persist('group spirit', groupsSpirit(), db.groupSpirit);
  await persist('shirt sizes', shirtSizes(), db.shirtSize);

  await persist('users', users(), db.user);
  await persist('organizer types', organizerTypes(), db.organizerType);
  await persist('organizers', organizers(), db.organizer);
  await persist('mailing list', mailingList(), db.mailingList);
  await persist('groups', groups(), db.group);
  await persist('events', events(), db.event);
  await persist('latest bib number', latestBibNumber(), db.latestBibNumber);
  await persist('documents', documents(), db.document);
  await persist('races', races(), db.race);
  await persist('perks', perks(), db.perk);
  await persist('sessions', sessions(), db.session);
  await persist('bookings', bookings(), db.booking);
  await persist('payments', payments(), db.payment);
  await persist('participants', participants(), db.participant);
  await persist('event teams', eventTeams(), db.eventTeam);
  await persist('race participants', raceParticipants(), db.raceParticipant);
  await persist('discount codes', discountCodes(), db.discountCode);
  await persist('favorite groups', favoriteGroup(), db.favoriteGroup);
  await persist('group schedules', groupsSchedules(), db.groupSchedule);
}

async function clear() {
  console.log('cleaning');
  await db.$queryRaw`TRUNCATE TABLE documents 
    , race_participants
    , event_teams
    , payments
    , payment_notifications
    , bookings
    , participants
    , races
    , perks
    , favorite_events
    , latest_bib_number
    , events
    , group_schedule
    , favorite_groups
    , groups
    , discount_codes
    , mailing_list
    , organizers
    , organizer_types
    , sessions
    , users
    , groups_spirit
    , groups_type
    , shirt_size
    , sports
    , difficulties`;

}

function parseDate(date: string | undefined | null) {
  if (!date) {
    return null;
  }

  if (!(date[0] === '+' || date[0] === '-')) {
    return new Date(date);
  }

  const direction = date[0] === '+' ? 'forward' : 'backword';
  const days = Number(date.substring(1)) * 86400 * 1000;

  const x = new Date(Date.now() + (direction === 'forward' ? days : days * -1));
  console.log(`Date: ${date} converts to ${x}`);

  return x;
}

clear().then(() => seed().then(disconnect).catch(disconnect));

function sports() {
  return sportsSeed.map((s) => s);
}

function groupTypes() {
  return groupTypesSeed.map((gt) => gt);
}

function shirtSizes() {
  return shirtSizesSeed;
}

function groupsSpirit() {
  return groupSpiritSeed.map((gs) => gs);
}

function events() {

  // a date in ~ 6 months
  const futureDate = new Date(`${new Date().getUTCFullYear() + 1}-10-21`);

  return eventsSeed.map((e) => {
    const assignedStartDate = parseDate(e.startAt);
    const assignedStopsAt = parseDate(e.bookingStopsAt);
    const startAt = new Date(
      assignedStartDate ? assignedStartDate : futureDate
    );
    const bookingStopsAt = assignedStopsAt
      ? assignedStopsAt
      : new Date(startAt.getTime() - 86400 * 1000 * 7);

    return {
      ...e,
      startAt,
      bookingStopsAt,
      endAt: startAt,
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    };
  });
}

function documents() {
  return documentsSeed.map((d) => {
    return {
      ...d,
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    };
  });
}

function races() {
  return racesSeed.map((r) => {
    // verify if it exists
    const validUntil: Date | null = r.validUntil
      ? parseDate(r.validUntil)
      : null;

    const applyAfter: Date | null = r.applyAfter
      ? parseDate(r.applyAfter)
      : null;

    return {
      ...r,
      createdAt: now,
      updatedAt: now,
      validUntil,
      applyAfter
    };
  });
}

function perks() {
  return perksSeed.map((p) => ({
    ...p,
    createdAt: now
  }));
}

function difficulties() {
  return difficultiesSeed.map((d) => d);
}

// Generated using the following SQL statement:
// --------------------------------------------
//
// SELECT substr(md5(random()::text), round(random() * 11 + 1)::int, 20) as id,
//   '2021-12-31T08:00:00Z'                                         as "updatedAt",
//   '2021-12-31T08:00:00Z'                                         as "createdAt",
//   lower(region) || '@gmail.com'                                  as email,
//   region                                                         as name,
//   null                                                           as role
// FROM (SELECT region, count(1) FROM locations GROUP BY region) l;
//
//
function users() {
  return usersSeed.map((u) => {
    return {
      ...u,
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(u.updatedAt)
    };
  });
}

function sessions() {
  return sessionsSeed.map((s) => {
    return {
      ...s,
      createdAt: new Date(),
      expirationDate: new Date('2100-10-16 19:29:16.667')
    };
  });
}

// Generated using the following SQL statement:
// --------------------------------------------
//
// SELECT substr(md5(random()::text), round(random() * 11 + 1)::int, 20) as id,
//   CASE
// WHEN abs(lat::int % 5) = 0 THEN 'Amigos de ' || city
// WHEN abs(lat::int % 5) = 1 THEN 'Associação recreativa ' || city
// WHEN abs(lat::int % 5) = 2 THEN 'Grupo Desporitvo de ' || city
// WHEN abs(lat::int % 5) = 3 THEN 'Patos de ' || city
// WHEN abs(lat::int % 5) = 4 THEN 'Borgas em ' || city
// END                                                              as name,
//   round(random() * 3 + 1)                                        as "sportId",
//   round(random() * 2 + 1)                                        as "groupTypeId",
//   round(random() * 4 + 1)                                        as "groupSpiritId",
//   lat,
//   lng,
//   city                                                           as location,
//   city                                                           as near,
//   round(random() * 5 + 1)                                        as "dayOfWeek",
//   round(random() * 16 + 5) * 100                                 as "timeOfDay",
//   null                                                           as whatsapp,
//   null                                                           as image1,
//   null                                                           as image2,
//   null                                                           as image3,
//   'published'                                                    as status,
//   (select id from users where name = region)                     as "createdById",
//   '2021-12-31T08:00:00Z'                                         as "updatedAt",
//   '2021-12-31T08:00:00Z'                                         as "createdAt"
// FROM locations;
//
//
function groups() {
  return groupsSeed.map((g) => {
    return {
      ...g,
      createdAt: new Date(g.createdAt),
      updatedAt: new Date(g.updatedAt)
    };
  });
}

function favoriteGroup() {
  return favoriteGroupsSeed.map((f) => {
    return {
      ...f,
      createdAt: now,
      updatedAt: now
    };
  });
}

function groupsSchedules() {
  return groupsSeed.map((g) => {
    return {
      id: g.id,
      dayOfWeek: g.dayOfWeek,
      timeOfDay: g.timeOfDay,
      groupId: g.id
    };
  });
}

function bookings() {
  return bookingsSeed.map((b) => {
    return {
      ...b,
      createdAt: now,
      updatedAt: now
    };
  });
}

function participants() {
  return participantsSeed.map((p) => {
    return {
      ...p,
      birthdate: p.birthdate ? new Date(p.birthdate) : null,
      createdAt: now,
      updatedAt: now
    };
  });
}

function raceParticipants() {
  return raceParticipantsSeed.map((rp) => {
    return {
      ...rp,
      createdAt: now,
      updatedAt: now
    };
  });
}

function organizers() {
  return organizerSeed.map((o) => {
    return {
      ...o,
      createdAt: now,
      updatedAt: now
    };
  });
}

function discountCodes() {
  return discountCodesSeed.map((v) => {
    return {
      ...v,
      createdAt: now,
      updatedAt: now
    };
  });
}

function eventTeams() {
  return eventTeamsSeed.map((v) => {
    return {
      ...v,
      createdAt: now,
      updatedAt: now
    };
  });
}

function latestBibNumber() {
  return latestBibNumberSeed.map((ed) => {
    return {
      ...ed,
      createdAt: now,
      updatedAt: now
    };
  });
}

function payments() {
  return paymentsSeed.map((p) => {
    return {
      ...p,
      expiresAt: new Date(now.getTime() + 3600000),
      createdAt: now,
      updatedAt: now
    };
  });
}

function organizerTypes() {
  return organizerTypesSeed.map((o) => {
    return {
      ...o,
      createdAt: now,
      updatedAt: now
    };
  });
}

function mailingList() {
  return mailingListSeed.map((m) => {
    return {
      ...m,
      createdAt: now
    };
  });
}


async function disconnect() {
  await db.$disconnect();
}
