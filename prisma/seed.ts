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
}

seed().then();

function sports() {
  return [
    {
      id: 1,
      name: { pt: 'Atletismo' },
      picture: 'running'
    },
    {
      id: 2,
      name: { pt: 'Trail' },
      picture: 'trail'
    },
    {
      id: 3,
      name: { pt: 'Ciclismo Estrada' },
      picture: 'road'
    },
    {
      id: 4,
      name: { pt: 'Ciclismo BTT' },
      picture: 'btt'
    },
    {
      id: 5,
      name: { pt: 'E-bike' },
      picture: 'ebike'
    },
    {
      id: 6,
      name: { pt: 'Gravel' },
      picture: 'gravel'
    },
    {
      id: 7,
      name: { pt: 'Enduro' },
      picture: 'enduro'
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
      position: 1,
      key: 'seed/MqmdXHau8JAjpfbCKJAW.png',
      eventId: 'bQmGXYkbhJetjk6mniMt',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: 'SbW72nZ5RbsXY6B9Ncts',
      position: 2,
      key: 'seed/LAJwAEY62EPjRjkKXSSu.png',
      eventId: 'bQmGXYkbhJetjk6mniMt',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: 'WPigAvEJZT9L66uuzp9a',
      position: 3,
      key: 'seed/hWLixbGygbkadiPdhDof.png',
      eventId: 'bQmGXYkbhJetjk6mniMt',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: 'NjENPYBRoBb6kmcBFS5d',
      position: 4,
      key: 'seed/sq7gTo6c68G4Nj9eadup.png',
      eventId: 'bQmGXYkbhJetjk6mniMt',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },

    {
      id: 'whW47SRRxxGSyip3uLqW',
      position: 1,
      key: 'seed/MqmdXHau8JAjpfbCKJAW.png',
      eventId: 'TgKZi8NQKNoJQGArd3zc',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: 'B25oJq3xthr8cM8GKqiW',
      position: 2,
      key: 'seed/LAJwAEY62EPjRjkKXSSu.png',
      eventId: 'TgKZi8NQKNoJQGArd3zc',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: '29AotH3sCcYWJph6Ftrx',
      position: 3,
      key: 'seed/hWLixbGygbkadiPdhDof.png',
      eventId: 'TgKZi8NQKNoJQGArd3zc',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: 'wdXiF63vAwvB46r6R3MR',
      position: 4,
      key: 'seed/sq7gTo6c68G4Nj9eadup.png',
      eventId: 'TgKZi8NQKNoJQGArd3zc',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
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
  const users = usersSeed.map((u) => {
    return {
      ...u,
      createdAt: new Date(u.createdAt),
      updatedAt: new Date(u.updatedAt),
      role: Role.MEMBER
    };
  });

  users.push({
    id: '3beca472138d6d234d3f',
    createdAt: new Date('2022-02-19 10:56:59.959'),
    updatedAt: new Date('2022-02-19 10:56:59.959'),
    email: 'u@gmail.com',
    name: 'Bike Brothers',
    role: Role.MEMBER
  });
  return users;
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
  const groups = groupsSeed.map((g) => {
    return {
      ...g,
      createdAt: new Date(g.createdAt),
      updatedAt: new Date(g.updatedAt)
    };
  });

  groups.push({
    id: 'FkoxmH5db6RXqBpExion',
    name: 'Bike Brothers Domingueira',
    slug: 'bike-brothers-domingueira',
    sportId: 3,
    groupTypeId: 1,
    groupSpiritId: 2,
    location: 'R Cónego Dr Manuel Faria',
    lat: 41.5513986,
    lng: -8.434844,
    near: 'Loja da Bike Brothers',
    dayOfWeek: 6,
    timeOfDay: 900,
    whatsapp: null,
    image1: null,
    image2: null,
    image3: null,
    createdAt: new Date('2021-06-01T08:00:00Z'),
    updatedAt: new Date('2021-06-01T08:00:00Z'),
    status: Status.published,
    createdById: '3beca472138d6d234d3f'
  });

  groups.push({
    id: 'GkoxmH5db6RXqBpExion',
    name: 'Bike Brothers BTT ao Sábado',
    slug: 'bike-brothers-btt-ao-sabado',
    sportId: 4,
    groupTypeId: 1,
    groupSpiritId: 2,
    location: 'R Cónego Dr Manuel Faria',
    lat: 41.5513986,
    lng: -8.434844,
    near: 'Loja da Bike Brothers',
    dayOfWeek: 5,
    timeOfDay: 900,
    whatsapp: null,
    image1: null,
    image2: null,
    image3: null,
    createdAt: new Date('2021-06-01T08:00:00Z'),
    updatedAt: new Date('2021-06-01T08:00:00Z'),
    status: Status.published,
    createdById: '3beca472138d6d234d3f'
  });
  return groups;
}
