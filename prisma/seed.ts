import { PrismaClient, Status, Role } from '@prisma/client'

const db = new PrismaClient()

async function seed() {
  await Promise.all(
    sports().map((data) => {
      return db.sport.create({ data })
    })
  )
  await Promise.all(
    groupTypes().map((data) => {
      return db.groupType.create({ data })
    })
  )
  await Promise.all(
    groupsSpirit().map((data) => {
      return db.groupSpirit.create({ data })
    })
  )
  await Promise.all(
    users().map((data) => {
      return db.user.create({ data })
    })
  )
  await Promise.all(
    groups().map((data) => {
      return db.group.create({ data })
    })
  )
  await Promise.all(
    events().map((data) => {
      return db.event.create({ data })
    })
  )
  await Promise.all(
    documents().map((data) => {
      return db.document.create({ data })
    })
  )
}

seed()

function sports() {
  return [
    {
      id: 1,
      name: { pt: 'Atletismo' }
    },
    {
      id: 2,
      name: { pt: 'Trail' }
    },
    {
      id: 3,
      name: { pt: 'Ciclismo Estrada' }
    },
    {
      id: 4,
      name: { pt: 'Ciclismo BTT' }
    }
  ]
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
  ]
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
  ]
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
  ]
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
  ]
}

function users() {
  return [
    {
      id: 'dummyuser',
      email: 'users@email.com',
      name: 'Filipe',
      role: Role.MEMBER
    }
  ]
}

function groups() {
  return [
    {
      id: 'FkoxmH5db6RXqBpExion',
      name: 'Bike Brothers Sunday Road',
      groupTypeId: 1,
      groupSpiritId: 2,
      location: '39.6929301,-8.302317',
      near: 'Loja da Bike Brothers',
      dayOfWeek: 6,
      timeOfDay: '09:00',
      whatsapp: null,
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z'),
      createdById: 'dummyuser'
    },
    {
      id: 'GkoxmH5db6RXqBpExion',
      name: 'Bike Brothers Saturday Mountain Bike',
      groupTypeId: 1,
      groupSpiritId: 2,
      location: '39.6929301,-8.302317',
      near: 'Loja da Bike Brothers',
      dayOfWeek: 5,
      timeOfDay: '09:00',
      whatsapp: null,
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z'),
      createdById: 'dummyuser'
    }
  ]
}
