import * as React from 'react'
import type { LoaderFunction } from 'remix'
import { ActionFunction, json, useActionData } from 'remix'
import { useTranslation } from 'react-i18next'
import Main from '~/components/shared/Main'
import CAGResponse from '~/server/response.server'
import { Form } from '@remix-run/react'
import { Spacer } from '~/components/shared/Spacer'
import Button, { ButtonLink } from '~/components/shared/Button'
import { AsyncComboBox, Option } from '~/components/shared/form/ComboBox'
import MapUtils from '~/utils/MapUtils'
import { Group, Location } from '~/types'
import { useState } from 'react'
import { findNearestGroups } from '~/server/db/locations.server'
import GroupEntry from '~/components/GroupEntry'

type ActionData = {
  search: string
  results: Array<Group>
}

export let loader: LoaderFunction = async ({ request }) => {
  return CAGResponse(request, ['home', 'm-groups'])
}

export const action: ActionFunction = async ({ request, params }) => {
  const form = await request.formData()
  const search = form.get('search') as string
  const coords = form.get('coords') as string
  const [lat, lng] = coords.split(',')
  const results = await findNearestGroups(parseFloat(lat), parseFloat(lng))

  return json({ results, search })
}

export default function Index() {
  let { t } = useTranslation('home')
  const [selection, setSelection] = useState<Option | undefined>()
  const data = useActionData<ActionData>()
  const mapUtils = new MapUtils()

  console.log(data?.results)
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
          <Button>{t('Search')}</Button>
        </Form>
      </div>
      <div className="mt-8">
        {data?.results.map((group) => (
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
    </Main>
  )
}

function coords(geo: Location) {
  return `${geo.lat},${geo.lng}`
}
