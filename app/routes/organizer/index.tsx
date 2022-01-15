import { useLoaderData } from '@remix-run/react'
import { json, Link, LinksFunction, LoaderFunction } from 'remix'
import i18n from '~/server/i18n.server'
import { useTranslation } from 'react-i18next'

import { Event } from '@prisma/client'
import React from 'react'
import DataTable from '~/components/shared/DataTable'
import { findEvents } from '~/server/db/events.server'

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
  const events = await findEvents()

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
