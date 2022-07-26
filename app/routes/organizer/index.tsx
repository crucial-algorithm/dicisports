import { useLoaderData } from '@remix-run/react'
import type { LinksFunction, LoaderFunction } from 'remix'
import { json } from 'remix'
import { Link } from '@remix-run/react'
import { useTranslation } from 'react-i18next'

import type { Event } from '@prisma/client'
import React from 'react'
import DataTable from '~/components/shared/DataTable'
import { findEvents } from '~/server/db/events.server'

type LoaderData = {
  events: Array<Event>
}

export const handle = {
  i18n: ['common', 'organizer']
}

export const loader: LoaderFunction = async ({ request }) => {
  const events = await findEvents()

  return json({
    events
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
