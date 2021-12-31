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
