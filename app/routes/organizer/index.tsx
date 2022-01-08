import { useLoaderData } from '@remix-run/react'
import { json, Link, LinksFunction, LoaderFunction } from 'remix'
import { db } from '~/utils/db.server'
import i18n from '~/utils/i18n.server'
import { useTranslation } from 'react-i18next'

import { Status, Event } from '@prisma/client'
import React from 'react'
import DataTable from '~/components/DataTable'

type ActionData = {
  formError?: string
  fieldErrors?: {
    name: string | undefined
    content: string | undefined
  }
  fields?: {
    name: string
    content: string
  }
}

type LoaderData = {
  events: Array<Event>
}

const badRequest = (data: ActionData) => json(data, { status: 400 })

export const loader: LoaderFunction = async ({ request }) => {
  const events = await db.event.findMany({
    where: {
      name: { not: Status.draft }
    }
  })

  return json({
    events,
    i18n: await i18n.getTranslations(request, ['organizer'])
  })
}

export const links: LinksFunction = () => {
  return []
}

export default function OrganizerIndexRoute() {
  const { t } = useTranslation('organizer')
  const { events } = useLoaderData<LoaderData>()

  return (
    <div>
      <DataTable data={events} t={t} />
      <Link to="event/create">{t('create')}</Link>
    </div>
  )
}
