import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function seed() {
  await Promise.all(
    getSports().map((data) => {
      return db.sport.create({ data })
    })
  )
}

seed()

function getSports() {
  return [
    {
      name: 'Atletismo'
    },
    {
      name: 'Trail'
    },
    {
      name: 'Ciclismo Estrada'
    },
    {
      name: 'Ciclismo BTT'
    }
  ]
}
