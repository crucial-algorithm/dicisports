import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function seed() {
  await Promise.all(
    sports().map((data) => {
      return db.sport.create({ data })
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
      name: 'Atletismo'
    },
    {
      id: 2,
      name: 'Trail'
    },
    {
      id: 3,
      name: 'Ciclismo Estrada'
    },
    {
      id: 4,
      name: 'Ciclismo BTT'
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
      useExternalBooking: false,
      externalBookingUrl: null,
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
      useExternalBooking: true,
      externalBookingUrl:
        'https://stopandgo.com.pt/events/viii-trilho-dos-reis',
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
      key: 'MqmdXHau8JAjpfbCKJAW',
      eventId: 'bQmGXYkbhJetjk6mniMt',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: 'SbW72nZ5RbsXY6B9Ncts',
      position: 2,
      key: 'hWLixbGygbkadiPdhDof',
      eventId: 'bQmGXYkbhJetjk6mniMt',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: 'WPigAvEJZT9L66uuzp9a',
      position: 3,
      key: 'LAJwAEY62EPjRjkKXSSu',
      eventId: 'bQmGXYkbhJetjk6mniMt',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: 'NjENPYBRoBb6kmcBFS5d',
      position: 4,
      key: 'sq7gTo6c68G4Nj9eadup',
      eventId: 'bQmGXYkbhJetjk6mniMt',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },

    {
      id: 'whW47SRRxxGSyip3uLqW',
      position: 1,
      key: 'MqmdXHau8JAjpfbCKJAW',
      eventId: 'TgKZi8NQKNoJQGArd3zc',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: 'B25oJq3xthr8cM8GKqiW',
      position: 2,
      key: 'hWLixbGygbkadiPdhDof',
      eventId: 'TgKZi8NQKNoJQGArd3zc',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: '29AotH3sCcYWJph6Ftrx',
      position: 3,
      key: 'LAJwAEY62EPjRjkKXSSu',
      eventId: 'TgKZi8NQKNoJQGArd3zc',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    },
    {
      id: 'wdXiF63vAwvB46r6R3MR',
      position: 4,
      key: 'sq7gTo6c68G4Nj9eadup',
      eventId: 'TgKZi8NQKNoJQGArd3zc',
      createdAt: new Date('2021-12-31T08:00:00Z'),
      updatedAt: new Date('2021-12-31T08:00:00Z')
    }
  ]
}
