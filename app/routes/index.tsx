import * as React from 'react'
import type { LoaderFunction } from 'remix'
import { ActionFunction, json, useActionData } from 'remix'
import { useTranslation } from 'react-i18next'
import Main from '~/components/shared/Main'
import CAGResponse from '~/server/response.server'
import { Form } from '@remix-run/react'
import { Spacer } from '~/components/shared/Spacer'
import Button from '~/components/shared/Button'
import { AsyncComboBox, Option } from '~/components/shared/form/ComboBox'
import MapUtils from '~/utils/MapUtils'
import { Group, Location } from '~/types'
import { useEffect, useState } from 'react'
import { countGroups, findNearestGroups } from '~/server/db/locations.server'
import GroupEntry from '~/components/GroupEntry'
import { ChevronDownIcon } from '@heroicons/react/solid'

type ActionData = {
  search: string
  results: Array<Group>
  total: number
  page?: number
  reset: boolean
}

export let loader: LoaderFunction = async ({ request }) => {
  return CAGResponse(request, ['home', 'm-groups'])
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
  const [selection, setSelection] = useState<Option | undefined>()
  const data = useActionData<ActionData>()
  const [page, setPage] = useState<number>(data?.page || 0)
  const [groups, setGroups] = useState<Array<Group>>([])
  const mapUtils = new MapUtils()
  let showMoreResults = false

  function HiddenPayload() {
    return (
      <>
        <input
          type="hidden"
          value={selection ? coords(selection.extra as Location) : ''}
          name="coords"
        />
        <input
          type="hidden"
          value={selection ? selection.value : ''}
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
          <AsyncComboBox
            ariaLabel={t('Search')}
            dataLoader={async (searchTerm) => {
              const results = await mapUtils.searchCity(searchTerm)
              if (results === null) return []
              return results.map((l: Location) => {
                return {
                  value: `${l.city}, ${l.region}`,
                  label: `${l.city}, ${l.region}`,
                  extra: l
                }
              })
            }}
            onSelect={(o) => setSelection(o as Option)}
            placeholder={t('Search Placeholder')}
            className="mr-4 w-full"
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
