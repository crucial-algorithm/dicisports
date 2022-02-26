import * as React from 'react'
import type { LoaderFunction } from 'remix'
import { ActionFunction, json, useActionData } from 'remix'
import { useTranslation } from 'react-i18next'
import Main from '~/components/shared/Main'
import CAGResponse from '~/server/response.server'
import { Form, useLoaderData } from '@remix-run/react'
import { Spacer } from '~/components/shared/Spacer'
import Button, { ButtonLink } from '~/components/shared/Button'
import { Group, GroupSpirit, Location, Sport } from '~/types'
import { useEffect, useState } from 'react'
import {
  countGroups,
  findCities,
  findNearestGroups
} from '~/server/db/locations.server'
import GroupEntry from '~/components/GroupEntry'
import {
  AdjustmentsIcon,
  ChevronDownIcon,
  ShareIcon
} from '@heroicons/react/solid'
import SearchLocations from '~/components/SearchLocations'
import ButtonGroup from '~/components/shared/ButtonGroup'
import { HeartIcon } from '@heroicons/react/outline'
import { Dialog } from '@reach/dialog'
import { H3, Paragraph } from '~/components/shared/typography'
import FormField from '~/components/shared/form/FormField'
import CheckBox from '~/components/shared/form/CheckBox'
import { findGroupsSpirit } from '~/server/db/groupsSpirit.server'
import { findSports } from '~/server/db/sports.server'
import ComboBox, { Option } from '~/components/shared/form/ComboBox'

type LoaderData = {
  cities: Location[]
  sports: Sport[]
  groupsSpirit: GroupSpirit[]
}

type ActionData = {
  search: string
  coords: string
  results: Group[]
  total: number
  page?: number
  reset: boolean
}

const actions = {
  filter: 'filter',
  search: 'search'
}

const dayParts = {
  morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening'
}

export let loader: LoaderFunction = async ({ request }) => {
  const cities = await findCities()
  return CAGResponse(
    request,
    {
      cities,
      sports: await findSports(),
      groupsSpirit: await findGroupsSpirit()
    },
    undefined,
    ['home', 'm-groups']
  )
}

async function searchAction(form: FormData): Promise<Response> {
  const search = form.get('search') as string
  let page = 0
  const p = form.get('page') as string
  if (p && !isNaN(parseInt(p))) page = parseInt(p)
  const coords = form.get('coords') as string
  let response: ActionData = {
    results: [],
    coords: '',
    search: '',
    total: 0,
    reset: true
  }
  if (!coords) return json(response)

  const [lat, lng] = coords.split(',')
  const results = (
    await findNearestGroups(
      parseFloat(lat),
      parseFloat(lng),
      null,
      null,
      null,
      null,
      10,
      page
    )
  ).map((g) => {
    return {
      ...g,
      distance: Math.round(g.distance || 0) // save some bandwidth
    }
  })
  const total = await countGroups()
  response = {
    search,
    coords,
    results,
    total,
    page,
    reset: form.get('load-more') === null
  }
  return json(response)
}

const dayPartToTimeInterval = (dayPart: string): [number, number] => {
  switch (dayPart) {
    case dayParts.morning:
      return [0, 1159]
    case dayParts.afternoon:
      return [1200, 1959]
    case dayParts.evening:
      return [2000, 2359]
    default:
      return [0, 2400]
  }
}

const reduceDayParts = (parts: [number, number][]): [number, number] => {
  const flattened: number[] = []
  parts.map((p) => flattened.push(...p))
  let min = 2500
  let max = 0
  flattened.map((value) => {
    min = Math.min(value, min)
    max = Math.max(value, max)
    return value
  })
  return [min, max]
}

async function filterAction(form: FormData): Promise<Response> {
  const dayParts = form.getAll('daypart') as string[]
  const spirit = form.getAll('spirit') as string[]
  const sport = form.get('sport') as string
  const coords = form.get('coords') as string
  const search = form.get('search') as string
  const [lat, lng] = coords.split(',')
  const results = (
    await findNearestGroups(
      parseFloat(lat),
      parseFloat(lng),
      spirit.map((s) => parseInt(s)),
      sport === null || parseInt(sport) === -1 ? null : parseInt(sport),
      null,
      dayParts === null
        ? null
        : reduceDayParts(dayParts.map(dayPartToTimeInterval))
    )
  ).map((g) => {
    return {
      ...g,
      distance: Math.round(g.distance || 0) // save some bandwidth
    }
  })

  let response: ActionData = {
    search,
    coords,
    results,
    total: 0,
    reset: true
  }
  return json(response)
}

export const action: ActionFunction = async ({ request, params }) => {
  const form = await request.formData()
  console.log('FORM ==> ', form)
  const action = form.get('actionId') as string
  if (action === actions.search) return searchAction(form)
  return filterAction(form)
}

export default function Index() {
  let { t } = useTranslation('home')
  const { cities, sports, groupsSpirit } = useLoaderData<LoaderData>()
  const [selection, setSelection] = useState<Location | undefined>()
  const data = useActionData<ActionData>()
  const [page, setPage] = useState<number>(data?.page || 0)
  const [groups, setGroups] = useState<Array<Group>>([])
  const [filtersModalOpen, setFiltersModalOpen] = useState<boolean>(false)

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

  let showMoreResults = !!data && data.results.length < data.total
  const sportsOptions: Option[] = [{ value: -1, label: t('All Sports') }]
  sports.map((s) => {
    sportsOptions.push({
      value: s.id,
      label: s.name
    })
    return s
  })

  return (
    <Main className="dark:text-blueGray-500">
      <Spacer size="2xs" />
      <div className="flex align-middle justify-center">
        <Form className="flex w-160" method="post">
          <input type="hidden" name="actionId" value={actions.search} />
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
      <Spacer size="xs" />
      {groups && groups.length > 0 ? (
        <div className="pl-6">
          <Button size="small" onClick={() => setFiltersModalOpen(true)}>
            <AdjustmentsIcon className="h-6" />
          </Button>
        </div>
      ) : null}
      <div>
        {groups.map((group) => (
          <GroupEntry
            group={group}
            key={group.id}
            actions={
              <ButtonGroup density="compact">
                <ButtonLink size="tiny" to={'/something'}>
                  <ShareIcon className="h-6 w-6 m-0 inline-block" />
                </ButtonLink>
                <ButtonLink size="tiny" to={'/something'}>
                  <HeartIcon className="h-6 w-6 m-0 inline-block" />
                </ButtonLink>
              </ButtonGroup>
            }
            footer={
              <span className="font-medium text-gray-500 dark:text-white">
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

      <Dialog
        onDismiss={() => setFiltersModalOpen(false)}
        isOpen={filtersModalOpen}
        aria-label="Delete your account"
        className="w-144 dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg lg:px-24 lg:py-14 lg:max-w-screen-lg"
      >
        <H3>{t('Filters')}</H3>
        <Paragraph>{t('Filters Refinement Hint')}</Paragraph>
        <Spacer size="2xs" />
        <Form
          id="filter-group-results"
          method="post"
          noValidate
          aria-describedby="general-error"
          onSubmit={() => setFiltersModalOpen(false)}
        >
          <input type="hidden" name="actionId" value={actions.filter} />
          <input type="hidden" name="coords" value={data?.coords} />
          <FormField
            label={t('Sport')}
            id="sport"
            className="md:w-96 lg:w-96 w-96"
          >
            <ComboBox options={sportsOptions} name="sport" />
          </FormField>
          <FormField
            label={t('Day Part')}
            id="day-part"
            className="md:w-96 lg:w-96 w-96"
          >
            <CheckBox
              name="daypart"
              label={t('Morning')}
              value={dayParts.morning}
              className="mb-2"
            />
            <CheckBox
              name="daypart"
              label={t('Afternoon')}
              value={dayParts.afternoon}
              className="mb-2"
            />
            <CheckBox
              name="daypart"
              label={t('Evening')}
              value={dayParts.evening}
              className="mb-2"
            />
          </FormField>
          <FormField
            label={t('Group Spirit')}
            id="spirit"
            className="md:w-96 lg:w-96 w-96"
          >
            {groupsSpirit.map((gs) => (
              <CheckBox
                key={gs.id}
                name="spirit"
                label={gs.name}
                value={gs.id}
                className="mb-2"
              />
            ))}
          </FormField>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setFiltersModalOpen(false)}
            >
              {t('Cancel')}
            </Button>
            <Button variant="primary" size="medium" type="submit">
              {t('Apply Filters')}
            </Button>
          </div>
        </Form>
      </Dialog>
    </Main>
  )
}

function coords(geo: Location) {
  return `${geo.lat},${geo.lng}`
}
