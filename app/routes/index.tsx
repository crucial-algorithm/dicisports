import * as React from 'react'
import type { LoaderFunction } from 'remix'
import { ActionFunction, json, useActionData } from 'remix'
import { useTranslation } from 'react-i18next'
import Main from '~/components/shared/Main'
import CAGResponse from '~/server/response.server'
import { Form, useLoaderData } from '@remix-run/react'
import { Spacer } from '~/components/shared/Spacer'
import Button from '~/components/shared/Button'
import { Group, Location } from '~/types'
import { useEffect, useState } from 'react'
import {
  countGroups,
  findCities,
  findNearestGroups
} from '~/server/db/locations.server'
import GroupEntry from '~/components/GroupEntry'
import { ChevronDownIcon } from '@heroicons/react/solid'
import SearchLocations from '~/components/SearchLocations'

type ActionData = {
  search: string
  results: Group[]
  total: number
  page?: number
  reset: boolean
}

export let loader: LoaderFunction = async ({ request }) => {
  const cities = await findCities()
  return CAGResponse(request, { cities }, undefined, ['home', 'm-groups'])
}

export const action: ActionFunction = async ({ request, params }) => {
  const form = await request.formData()
  console.log(form)
  const search = form.get('search') as string
  let page = 0
  const p = form.get('page') as string
  if (p && !isNaN(parseInt(p))) page = parseInt(p)
  const coords = form.get('coords') as string
  let response: ActionData = {
    results: [],
    search: '',
    total: 0,
    reset: true
  }
  if (!coords) return json(response)

  const [lat, lng] = coords.split(',')
  const results = (
    await findNearestGroups(parseFloat(lat), parseFloat(lng), 10, page)
  ).map((g) => {
    return {
      ...g,
      distance: Math.round(g.distance || 0) // save some bandwidth
    }
  })
  const total = await countGroups()
  response = {
    results,
    search,
    total,
    page,
    reset: form.get('load-more') === null
  }
  return json(response)
}

export default function Index() {
  let { t } = useTranslation('home')
  const { cities } = useLoaderData<{ cities: Location[] }>()
  const [selection, setSelection] = useState<Location | undefined>()
  const data = useActionData<ActionData>()
  const [page, setPage] = useState<number>(data?.page || 0)
  const [groups, setGroups] = useState<Array<Group>>([])
  let showMoreResults = false

  function HiddenPayload() {
    return (
      <>
        <input
          type="hidden"
          value={selection ? coords(selection) : ''}
          name="coords"
        />
        <input
          type="hidden"
          value={selection ? `${selection.city}, ${selection.region}` : ''}
          name="search"
        />
        <input type="hidden" value={page} name="page" />
      </>
    )
  }

  useEffect(() => {
    if (!data) return
    const { results, reset } = data
    if (reset) setPage(0)
    if (results) {
      const list = reset ? [] : [...groups]
      results.map((r) => list.push(r))
      setGroups(list)
    }
  }, [data])

  showMoreResults = !!data && data.results.length < data.total
  return (
    <Main className="dark:text-blueGray-500">
      <Spacer size="2xs" />
      <div className="flex align-middle justify-center">
        <Form className="flex w-160" method="post">
          <SearchLocations
            ariaLabel={t('Search')}
            cities={cities}
            onSelect={(o) => setSelection(o as Location)}
            placeholder={t('Search Placeholder')}
            className="px-0 mr-4 w-full"
          />
          <HiddenPayload />
          <Button>{t('Search')}</Button>
        </Form>
      </div>
      <div className="mt-8">
        {groups.map((group) => (
          <GroupEntry
            group={group}
            key={group.id}
            footer={
              <span className="text-white">
                {Math.ceil(group.distance || 0)} km
              </span>
            }
          />
        ))}
      </div>
      {showMoreResults ? (
        <Form method="post">
          <div className="mb-8 flex align-middle justify-center">
            <Button
              name="load-more"
              value={page}
              onClick={() => setPage(page + 1)}
            >
              <ChevronDownIcon width="22" /> {t('Load More')}
            </Button>
          </div>
          <HiddenPayload />
        </Form>
      ) : null}
    </Main>
  )
}

function coords(geo: Location) {
  return `${geo.lat},${geo.lng}`
}
