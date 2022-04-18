import * as React from 'react'
import { SyntheticEvent, useEffect, useRef, useState } from 'react'
import type { LoaderFunction } from 'remix'
import { Link, useFetcher, useLocation } from 'remix'
import { useTranslation } from 'react-i18next'
import Main from '~/components/shared/Main'
import CAGResponse from '~/server/response.server'
import { Form, useLoaderData } from '@remix-run/react'
import { Spacer } from '~/components/shared/Spacer'
import Button from '~/components/shared/Button'
import {
  DaysOfWeek,
  DiciLocation,
  Group,
  GroupFilters,
  GroupSpirit,
  Language,
  Sport
} from '~/types'
import { findNearestGroups } from '~/server/db/locations.server'
import GroupEntry from '~/components/GroupEntry'
import {
  AdjustmentsIcon,
  ChevronDownIcon,
  ShareIcon,
  HeartIcon as Favorite
} from '@heroicons/react/solid'
import SearchLocations from '~/components/SearchLocations'
import ButtonGroup from '~/components/shared/ButtonGroup'
import { HeartIcon } from '@heroicons/react/outline'
import { H3 } from '~/components/shared/typography'
import FormField from '~/components/shared/form/FormField'
import CheckBox from '~/components/shared/form/CheckBox'
import { findGroupsSpirit } from '~/server/db/groupsSpirit.server'
import { findSports } from '~/server/db/sports.server'
import ComboBox, { Option } from '~/components/shared/form/ComboBox'
import clsx from 'clsx'
import { getLocalizedText, PeekDayOfWeek } from '~/utils/misc'
import NoResults from '~/components/illustrations/NoResults'
import { TFunction } from 'i18next'
import HomeLogo from '~/components/shared/HomeLogo'
import DisplayImg from '~/components/shared/DisplayImg'
import { findUserFavoriteGroups } from '~/server/db/groups.server'
import { getUser } from '~/server/auth/session.server'
import { Notification } from '~/components/shared/NotificationMessage'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import Config from '~/server/config.server'

type FilterParams = {
  actionId: keyof typeof actions | null
  coords: string | null
  search: string | null
  spirit: number[] | null
  dayParts: string[] | null
  page: number | null
  sport: number | null
  dayOfWeek: number | null
}

type LoaderData = {
  sports: Sport[]
  groupsSpirit: GroupSpirit[]
  result: ActionData
  favorites: Group[]
  mapToken: string
}

type ActionData = {
  results: Group[]
  filters: null | GroupFilters
  total: number
  page?: number
  reset: boolean
}

const actions = {
  filter: 'filter',
  search: 'search',
  more: 'more',
  pickSport: 'pickSport'
}

const dayParts = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening'
}

const countryCoords = {
  PT: [40.2287547, -8.4512937]
}

export let loader: LoaderFunction = async ({ request, params, context }) => {
  const data = parseQueryString(request.url)
  // Initial load
  const user = await getUser(request)
  const favorites = user ? await findUserFavoriteGroups(user.id) : []

  let result: ActionData | null = null
  let page = data.page || 0
  if (data.actionId === actions.search || data.actionId === actions.more) {
    result = await search(
      data.dayParts,
      data.spirit,
      data.sport,
      data.coords,
      data.dayOfWeek || -1,
      data.actionId === actions.more ? page + 1 : page,
      data.actionId !== actions.more
    )
  }

  const { MAPBOX_TOKEN } = Config()

  return CAGResponse(
    request,
    {
      sports: await findSports(),
      groupsSpirit: await findGroupsSpirit(),
      favorites,
      result,
      mapToken: MAPBOX_TOKEN
    },
    undefined,
    ['home', 'm-groups']
  )
}

function parseQueryString(url: string): FilterParams {
  const { searchParams } = new URL(url)
  const actionId = searchParams.get('actionId') as keyof typeof actions
  const coords = searchParams.get('coords')
  const search = searchParams.get('search')
  const page = numberOrNull(searchParams.get('page'))
  const sport = numberOrNull(searchParams.get('sport'))
  const dayOfWeek = numberOrNull(searchParams.get('dow'))
  const dayParts = searchParams.getAll('daypart')
  const spirit = searchParams.getAll('spirit')
  return {
    actionId,
    coords,
    search,
    page,
    sport,
    dayOfWeek,
    dayParts: dayParts,
    spirit: spirit.map((v) => parseInt(v))
  }
}

function numberOrNull(value: string | null) {
  if (value === null) return null
  const n = parseInt(value, 10)
  if (isNaN(n)) return null
  return n
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

async function search(
  dayParts: string[] | null,
  spirit: number[] | null,
  sport: number | null,
  coords: string | null,
  dayOfWeek: number,
  page: number,
  reset: boolean = true
): Promise<ActionData> {
  const [lat, lng] = coords ? coords.split(',') : countryCoords.PT
  const filters = {
    spirit: spirit || null,
    sport: !sport || sport === -1 ? null : sport,
    dayOfWeek: dayOfWeek === -1 ? null : dayOfWeek,
    timeOfDay:
      dayParts === null || dayParts.length === 0
        ? null
        : reduceDayParts(dayParts.map(dayPartToTimeInterval))
  }
  const { total, results } = await findNearestGroups(
    typeof lat === 'string' ? parseFloat(lat) : lat,
    typeof lng === 'string' ? parseFloat(lng) : lng,
    filters,
    10,
    page
  )

  return {
    results: results.map((g) => {
      return {
        ...g,
        distance: Math.round(g.distance || 0) // save some bandwidth
      }
    }),
    total,
    filters,
    reset,
    page
  }
}

export default function Index() {
  let { t, i18n } = useTranslation('home')
  const lang = i18n.language as Language
  let tc = useTranslation('common').t
  const { sports, groupsSpirit, result, favorites, mapToken } =
    useLoaderData<LoaderData>()
  const [selection, setSelection] = useState<DiciLocation | undefined>()
  const data = result
  const [page, setPage] = useState<number>(data?.page || 0)
  const [groups, setGroups] = useState<Array<Group>>([])
  const [filtersModalOpen, setFiltersModalOpen] = useState<boolean>(false)
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false)
  const [address, setAddress] = useState<string>('')
  const location = useLocation()
  const filters = parseQueryString(`https://a.com/${location.search}`)

  useEffect(() => {
    if (!result) {
      if (groups.length > 0) {
        setGroups([])
        setSearchPerformed(false)
        setFiltersModalOpen(false)
      }
      return
    }
    setSearchPerformed(true)

    const { reset, results } = result

    if (reset) setPage(0)
    if (!results) return
    const list = reset ? [] : [...groups]

    results.map((r) => list.push(r))
    setGroups(list)
    setAddress(new URL(window.location.href).origin)

    // when people go back, remove search performed, to make sure the
    // grid of sports appears again
    window.onpopstate = handleResetSearchPerformed
    return () => {
      window.onpopstate = null
    }
  }, [result, location])

  let showMoreResults = !!data && data.results.length < data.total

  function handleOnSubmit() {
    setSearchPerformed(true)
    setFiltersModalOpen(false)
  }

  function handleSearchLocations(
    o: DiciLocation | SyntheticEvent<HTMLSelectElement>
  ) {
    setSelection(o as DiciLocation)
  }

  function handleOpenFilters() {
    setFiltersModalOpen(true)
  }

  function handleCloseFilters() {
    setFiltersModalOpen(false)
  }

  function handleLoadNextPage() {
    setPage(page + 1)
  }

  function handleResetSearchPerformed() {
    setSearchPerformed(false)
  }

  return (
    <Main className="dark:text-blueGray-500 relative mb-8">
      <Form method="get" onSubmit={handleOnSubmit}>
        <input
          type="hidden"
          value={selection ? selection.coords : ''}
          name="coords"
        />
        <input
          type="hidden"
          value={selection ? `${selection.address}` : ''}
          name="search"
        />
        <input type="hidden" name="page" value={result?.page || 0} />
        <div className="flex align-middle justify-center">
          <Link to="/" onClick={handleResetSearchPerformed}>
            <HomeLogo className="w-112 h-16" />
          </Link>
        </div>
        <Spacer size="2xs" />
        <div className="flex align-middle justify-center">
          <div className="flex w-160">
            <SearchLocations
              ariaLabel={t('Search')}
              onSelect={handleSearchLocations}
              placeholder={t('Search Placeholder')}
              className="px-0 mr-4 w-full search-select"
              mapToken={mapToken}
            />
            <Button name="actionId" value={actions.search}>
              {t('Search')}
            </Button>
          </div>
        </div>
        <FiltersDialog
          isOpen={filtersModalOpen}
          sports={sports}
          groupsSpirit={groupsSpirit}
          triggerModalClose={handleCloseFilters}
          filters={filters}
        />
        <Spacer size="xs" />
        {searchPerformed ? (
          <div className="pl-6 flex align-middle">
            <Button size="small" onClick={handleOpenFilters} type="button">
              <AdjustmentsIcon className="h-6" />
            </Button>
            <div className="flex mx-2 items-center dark:text-white text-blueGray-500 text-sm">
              {data?.total
                ? t('Number of Groups Found', { total: data?.total })
                : null}
            </div>
            <DisplayFilters
              filters={filters}
              sports={sports}
              spirits={groupsSpirit}
              t={t}
              tc={tc}
            />
          </div>
        ) : null}
        {showMoreResults ? (
          <>
            <div className="mb-8 flex align-middle justify-center absolute bottom-0 w-full">
              <Button
                name="actionId"
                value={actions.more}
                onClick={handleLoadNextPage}
              >
                <ChevronDownIcon width="22" /> {t('Load More')}
              </Button>
            </div>
          </>
        ) : null}
      </Form>
      <div className="pb-12">
        {searchPerformed && groups.length === 0 ? (
          <div className="w-full flex justify-center mt-8">
            <NoResults />
          </div>
        ) : (
          groups.map((group) => (
            <GroupResult
              group={group}
              key={group.id}
              isUserFavorite={
                favorites.find((g) => g.id === group.id) !== undefined
              }
              img={sports.find((s) => s.id === group.sportId)?.picture}
              favAddedMessage={t('Favorite Added')}
              favRemovedMessage={t('Favorite Removed')}
              copiedToClipMessage={t('Copied to Clipboard')}
              address={address}
            />
          ))
        )}
      </div>
      {!searchPerformed ? (
        <>
          <SportsGrid sports={sports} lang={lang} t={t} />
        </>
      ) : null}
    </Main>
  )
}

function GroupResult({
  group,
  img,
  isUserFavorite,
  favAddedMessage,
  favRemovedMessage,
  copiedToClipMessage,
  address
}: {
  group: Group
  img?: string
  isUserFavorite: boolean
  favAddedMessage: string
  favRemovedMessage: string
  copiedToClipMessage: string
  address: string
}) {
  const favorite = useFetcher()
  const ref = useRef()
  const [message, setMessage] = useState<string>(favAddedMessage)
  let showFavoriteAddedNotification: any = null
  let showCopiedToClipboardNotification: any = null

  function handlerSetShowNotificationFunction(callback: () => void) {
    showFavoriteAddedNotification = callback
  }

  function handlerSetShowNotificationCopyToClipboard(callback: () => void) {
    showCopiedToClipboardNotification = callback
  }

  function handlerClickToCopy() {
    showCopiedToClipboardNotification()
  }

  useEffect(() => {
    if (favorite.type === 'done' && favorite.data.ok) {
      if (ref.current) (ref.current as HTMLFormElement).reset()
      setMessage(
        favorite.data.action === 'add' ? favAddedMessage : favRemovedMessage
      )
      showFavoriteAddedNotification()
    }
  }, [
    favorite,
    favAddedMessage,
    favRemovedMessage,
    showFavoriteAddedNotification
  ])

  return (
    <GroupEntry
      group={group}
      key={group.id}
      img={img}
      actions={
        <ButtonGroup density="compact">
          <CopyToClipboard
            text={`${address}/group/${group.slug}`}
            onCopy={handlerClickToCopy}
          >
            <Button size="tiny" type="submit">
              <ShareIcon className="h-6 w-6 m-0 inline-block" />
            </Button>
          </CopyToClipboard>
          <favorite.Form
            // @ts-ignore
            ref={ref}
            method="post"
            action={`/m/group/fav/${group.id}`}
          >
            {isUserFavorite ? (
              <Button size="tiny" name="action" value="remove">
                <Favorite className="h-6 w-6 m-0 inline-block" />
              </Button>
            ) : (
              <Button size="tiny" name="action" value="add">
                <HeartIcon className="h-6 w-6 m-0 inline-block" />
              </Button>
            )}
          </favorite.Form>
          <Notification show={handlerSetShowNotificationFunction}>
            {message}
          </Notification>
          <Notification show={handlerSetShowNotificationCopyToClipboard}>
            {copiedToClipMessage}
          </Notification>
        </ButtonGroup>
      }
      footer={
        <span className="font-medium text-gray-500 dark:text-white">
          {Math.ceil(group.distance || 0)} km
        </span>
      }
    />
  )
}

function SportsGrid({
  sports,
  lang,
  t
}: {
  sports: Sport[]
  lang: Language
  t: TFunction
}) {
  if (!sports) return null

  return (
    <div className="grid grid-rows-3 grid-flow-col gap-4">
      {sports
        .sort((a, b) => a.id - b.id)
        .map((s) => (
          <Link to={`?actionId=${actions.search}&sport=${s.id}`} key={s.id}>
            <DisplayImg
              id={`product/sports/${s.picture}`}
              key={s.id}
              alt={getLocalizedText(lang, s.name)}
            />
          </Link>
        ))}
      {new Array(9 - sports.length).fill(null).map((a, i) => (
        <a
          href={`mailto:info@smartcitizen.pt?subject=${t(
            'Add Sport Mail Subject'
          )}`}
          key={i}
        >
          <DisplayImg
            id={`product/sports/add-sport`}
            key={i}
            alt={t('Add Sport')}
          />
        </a>
      ))}
    </div>
  )
}

/**
 * Not using @reach/dialog in order to inline form controls and keep
 * all state in a single form
 *
 * @param props
 * @constructor
 */
function FiltersDialog(props: {
  isOpen: boolean
  sports: Sport[]
  groupsSpirit: GroupSpirit[]
  triggerModalClose: () => void
  filters: FilterParams | null
}) {
  let { t, i18n } = useTranslation('home')
  const { isOpen, sports, groupsSpirit, triggerModalClose, filters } = props
  const sportsOptions: Option[] = []
  sports.map((s) => {
    sportsOptions.push({
      value: s.id,
      label: s.name
    })
    return s
  })
  return (
    <div
      data-reach-dialog-overlay={true}
      className={clsx({
        'hidden ': !isOpen,
        'z-50 flex h-screen': isOpen
      })}
    >
      <div
        aria-modal={true}
        aria-label={t('Filters')}
        className={clsx(
          'w-144 bg-white dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg lg:px-24 lg:py-14 lg:max-w-screen-lg font-extrabold',
          {
            'hidden ': !isOpen,
            'm-auto': isOpen
          }
        )}
      >
        <H3>{t('Filters')}</H3>
        <Spacer size="2xs" />

        <FormField
          label={t('Sport')}
          id="sport"
          className="md:w-96 lg:w-96 w-96"
        >
          <ComboBox
            options={sportsOptions}
            name="sport"
            defaultValue={filters?.sport || -1}
            placeholder={t('All Sports')}
            lang={i18n.language as Language}
          />
        </FormField>
        <FormField
          label={t('Day Of Week')}
          id="day-of-week"
          className="md:w-96 lg:w-96 w-96"
        >
          <PeekDayOfWeek
            name="dow"
            id="day-of-week"
            defaultValue={filters?.dayOfWeek as DaysOfWeek}
            addAll={true}
          />
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
            checked={filters?.dayParts?.includes(dayParts.morning)}
            className="mb-2"
          />
          <CheckBox
            name="daypart"
            label={t('Afternoon')}
            value={dayParts.afternoon}
            checked={filters?.dayParts?.includes(dayParts.afternoon)}
            className="mb-2"
          />
          <CheckBox
            name="daypart"
            label={t('Evening')}
            value={dayParts.evening}
            checked={filters?.dayParts?.includes(dayParts.evening)}
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
              checked={filters?.spirit?.includes(gs.id)}
              className="mb-2"
            />
          ))}
        </FormField>
        <div className="flex flex-wrap gap-4">
          <Button variant="secondary" type="button" onClick={triggerModalClose}>
            {t('Cancel')}
          </Button>
          <Button
            variant="primary"
            size="medium"
            type="submit"
            name="actionId"
            value={actions.search}
          >
            {t('Apply Filters')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function DisplayFilters(props: {
  filters: FilterParams
  sports: Sport[]
  spirits: GroupSpirit[]
  t: TFunction
  tc: TFunction
}) {
  const { i18n } = useTranslation()
  const language = i18n.language
  const { filters, sports, spirits, t, tc } = props
  if (!filters) return null
  const { spirit, sport, dayOfWeek, dayParts } = filters
  let label: string[] = []

  if (dayOfWeek !== null && dayOfWeek >= 0) {
    label.push(
      tc(
        [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday'
        ][dayOfWeek]
      )
    )
  }
  // if all dayparts are picked, just ignore to save space
  if (dayParts && dayParts.length > 0 && dayParts.length !== 3) {
    let parts = semanticOr(
      dayParts.map((v) => t(v)),
      t('Or')
    )
    if (label.length === 1) label[0] = `${label[0]}, ${parts}`
    else label.push(parts)
  }

  if (sport) label.push(mapIdToName(sport, sports, language as Language))

  if (spirit && spirit.length > 0 && spirit.length !== 5)
    label.push(
      t('Filter Spirit', {
        sport: semanticOr(
          spirit.map((s) => mapIdToName(s, spirits, language as Language)),
          t('Or')
        )
      })
    )

  return (
    <div className="flex mx-2 items-center dark:text-white text-blueGray-500 text-sm">
      {label.join(' | ')}
    </div>
  )
}

/**
 * Create a human readable phrase from a list of strings
 * @param list
 * @param or
 */
function semanticOr(list: string[], or: string) {
  if (list.length === 1) return list[0]
  return `${list.slice(0, -1).join(', ')} ${or} ${list.slice(-1)}`
}

function mapIdToName(
  id: number,
  universe: Sport[] | GroupSpirit[],
  lang: Language
): string {
  const entity = universe.find((u) => u.id === id)
  return getLocalizedText(lang, entity?.name)
}
