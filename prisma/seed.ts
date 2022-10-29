import { PrismaClient, Status, Role } from '@prisma/client';

import usersSeed from './data/users.json';
import groupsSeed from './data/groups.json';

const db = new PrismaClient();

async function persist(name: string, list: Array<any>, entity: any) {
  await Promise.all(
    list.map((data) => {
      return entity.create({ data });
    })
  )
    .catch((err) => {
      if (err.code === 'P2002') {
        console.log(`${name} already in db. skipping...`);
        return;
      }
      console.error(`error seeding ${name}`, err);
    })
    .then(() => {
      console.log(`seeded ${name}`);
    });
}

async function seed() {
  await persist('sports', sports(), db.sport);
  await persist('group types', groupTypes(), db.groupType);
  await persist('group spirit', groupsSpirit(), db.groupSpirit);

  await persist('users', users(), db.user);
  await persist('groups', groups(), db.group);
  await persist('events', events(), db.event);
  await persist('documents', documents(), db.document);
  await persist('sessions', sessions(), db.session);
}

async function clear() {
  await db.document.deleteMany();
  await db.race.deleteMany();
  await db.perk.deleteMany();
  await db.event.deleteMany();
  await db.groupSchedule.deleteMany();
  await db.favoriteGroup.deleteMany();
  await db.group.deleteMany();
  await db.user.deleteMany();
  await db.groupSpirit.deleteMany();
  await db.groupType.deleteMany();
  await db.sport.deleteMany();
}

clear().then(() => seed().then());

function sports() {
  return [
    {
      id: 1,
      name: { pt: 'Atletismo' },
      picture: 'running_dtwkmj'
    },
    {
      id: 2,
      name: { pt: 'Trail' },
      picture: 'trail_o1psbv'
    },
    {
      id: 3,
      name: { pt: 'Ciclismo Estrada' },
      picture: 'road_npwaqu'
    },
    {
      id: 4,
      name: { pt: 'Ciclismo BTT' },
      picture: 'btt_dm3gqq'
    },
    {
      id: 5,
      name: { pt: 'E-bike' },
      picture: 'ebike_v4ae6b'
    },
    {
      id: 6,
      name: { pt: 'Gravel' },
      picture: 'gravel_a3zrzj'
    },
    {
      id: 7,
      name: { pt: 'Enduro' },
      picture: 'enduro_m3s1ti'
    }
  ];
}

function groupTypes() {
  return [
    {
      id: 1,
      name: { pt: 'Informal' }
    },
    {
      id: 2,
      name: { pt: 'Clube' }
    },
    {
      id: 3,
      name: { pt: 'Loja' }
    }
  ];
}

function groupsSpirit() {
  return [
    {
      id: 1,
      name: { pt: 'Convívio' }
    },
    {
      id: 2,
      name: { pt: 'Desportivo' }
    },
    {
      id: 3,
      name: { pt: 'Treino' }
    },
    {
      id: 4,
      name: { pt: 'Amizade' }
    },
    {
      id: 5,
      name: { pt: 'Turismo' }
    }
  ];
}

function events() {
  return [
    {
      id: 'bQmGXYkbhJetjk6mniMt',
      name: 'Trail do Zêzere',
      sportId: 2,
      startAt: new Date('2022-01-22T08:00:00Z'),
      endAt: new Date('2022-01-22T18:00:00Z'),
      location: '39.6929301,-8.302317',
      address: 'Ferreira do Zêzere',
      useExternalBooking: false,
      externalBookingUrl: null,
      status: Status.auto,
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: 'TgKZi8NQKNoJQGArd3zc',
      name: 'Flavius Challenge OCR',
      sportId: 1,
      startAt: new Date('2022-02-18T10:00:00Z'),
      endAt: new Date('2022-02-19T15:00:00Z'),
      location: '41.7352772,-7.4712548',
      address: 'Chaves',
      useExternalBooking: true,
      externalBookingUrl:
        'https://stopandgo.com.pt/events/viii-trilho-dos-reis',
      status: Status.auto,
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    }
  ];
}

function documents() {
  return [
    {
      id: 'iMJfFDJkQK3FWW8C5YW8',
      path: 'seed/MqmdXHau8JAjpfbCKJAW.png',
      position: 1,
      label: 'regulamento',
      eventId: 'bQmGXYkbhJetjk6mniMt',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z'),
      status: Status.auto
    }
  ];
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
      updatedAt: new Date(u.updatedAt),
      role: Role.MEMBER
    };
  });
}

function sessions() {
  return [
    {
      id: 'c4e1b568-0e30-466d-8ff0-e10f212e3c5f',
      userId: 'nTQ8idPqTY8PmhzbsN4u',
      createdAt: new Date(),
      expirationDate: new Date('2100-10-16 19:29:16.667')
    }
  ];
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
