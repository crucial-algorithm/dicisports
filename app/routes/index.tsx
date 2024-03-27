import { useCreation } from 'ahooks';
import type { SyntheticEvent } from 'react';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  Form,
  Link,
  useFetcher,
  useLoaderData,
  useLocation
} from '@remix-run/react';
import { useTranslation } from 'react-i18next';

import type { Event } from '@prisma/client';

import {
  AdjustmentsVerticalIcon,
  ChevronDownIcon
} from '@heroicons/react/24/solid';

import clsx from 'clsx';

import EventResult from '~/components/SearchEventResult';
import SportsGrid from '~/components/HomeSportsGrid';
import GroupResult from '~/components/SearchGroupResult';
import { FiltersDialog, DisplayFilters } from '~/components/SearchFilters';
import DisplayImg from '~/components/shared/DisplayImg';

import Main from '~/components/shared/Main';
import { Spacer } from '~/components/shared/Spacer';
import Button, { ButtonLink } from '~/components/shared/Button';
import type {
  DaysOfWeek,
  DiciLocation,
  Group,
  GroupFilters,
  GroupSpirit,
  Language,
  SearchResults,
  Sport
} from '~/types';
import { searchEventsAndGroups } from '~/server/db/search.server';

import SearchLocations from '~/components/SearchLocations';

import { H5, Paragraph } from '~/components/shared/typography';
import { findGroupsSpirit, findSports } from '~/server/db/reference.server';

import Dialog from '~/components/shared/Dialog';
import HomeLogo from '~/components/shared/HomeLogo';
import { findUserFavoriteGroups } from '~/server/db/groups.server';
import { getUser } from '~/server/auth/session.server';

import Config from '~/server/config.server';
import TransitionIndicator from '~/components/shared/TransitionIndicator';
import { useRootData } from '~/hooks';
import { getLocationSession } from '~/routes/action/set-my-location';
import { useUserLocation } from '~/utils/LocationProvider';
import { CanonicalMeta } from '~/utils/seo';

import {
  findLatestPublishedEvents,
  findUserFavoriteEvents
} from '~/server/db/events.server';

export type FilterParams = {
  actionId: keyof typeof actions | null;
  coords: string | null;
  search: string | null;
  spirit: number[] | null;
  dayParts: string[] | null;
  page: number | null;
  sport: number | null;
  dayOfWeek: number | null;
  orderBy: SortMethod;
  groupsAction: string | null;
};

type LoaderData = {
  sports: Sport[];
  groupsSpirit: GroupSpirit[];
  searchResult: ActionData;
  favoriteGroups: Group[];
  favoriteEvents: Event[];
  mapToken: string;
  selectedDayParts: string[] | null;
  latestEvents: Event[];
};

type ActionData = {
  results: SearchResults[];
  filters: null | GroupFilters;
  total: number;
  page?: number;
  reset: boolean;
};

const actions = {
  filter: 'filter',
  search: 'search',
  more: 'more',
  pickSport: 'pickSport',
  sort: 'sort'
};

const dayParts = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening'
};

export const handle = {
  i18n: ['common', 'home', 'm-groups', 'organizer']
};

export enum SortMethod {
  recency = 'recent',
  proximity = 'proximity'
}

export const meta: MetaFunction = CanonicalMeta as MetaFunction;

export const loader: LoaderFunction = async ({ request }) => {
  const data = parseQueryString(request.url);
  // Initial load
  const user = await getUser(request);
  const favoriteGroups = user ? await findUserFavoriteGroups(user.id) : [];
  const favoriteEvents = user ? await findUserFavoriteEvents(user.id) : [];
  let latestEvents: Event[] = [];

  let result: ActionData | null = null;
  const page = data.actionId === actions.search ? 0 : data.page || 0;

  if (
    data.actionId === actions.search ||
    data.actionId === actions.more ||
    data.actionId === actions.sort
  ) {
    const locationSession = await getLocationSession(request);
    const [lat, lng] = locationSession.getLocation() || [];

    result = await search(
      data.dayParts,
      data.spirit,
      data.sport,
      data.coords
        ? (data.coords.split(',').map(Number) as [number, number])
        : null,
      data.dayOfWeek,
      data.actionId === actions.more ? page + 1 : page,
      data.actionId !== actions.more,
      !isNaN(Number(lat)) ? [Number(lat), Number(lng)] : null,
      data.orderBy === SortMethod.proximity,
      data.groupsAction !== 'hide'
    );
  } else {
    latestEvents = await findLatestPublishedEvents();
  }

  const { MAPBOX_TOKEN } = Config();

  return json({
    sports: await findSports(),
    groupsSpirit: await findGroupsSpirit(),
    favoriteGroups,
    favoriteEvents,
    searchResult: result,
    mapToken: MAPBOX_TOKEN,
    selectedDayParts: data.dayParts,
    latestEvents
  });
};

function parseQueryString(url: string): FilterParams {
  const { searchParams } = new URL(url);
  const actionId = searchParams.get('actionId') as keyof typeof actions;
  const coords = searchParams.get('coords');
  const search = searchParams.get('search');
  const page = numberOrNull(searchParams.get('page'));
  const sport = numberOrNull(searchParams.get('sport'));
  const dayOfWeek = numberOrNull(searchParams.get('dow'));
  const dayParts = searchParams.getAll('daypart');
  const spirit = searchParams.getAll('spirit');
  const orderBy = searchParams.get('order');
  const groupsAction = searchParams.get('g');

  return {
    actionId,
    coords,
    search,
    page,
    sport,
    dayOfWeek: dayOfWeek === null || dayOfWeek < 0 ? null : dayOfWeek,
    dayParts: dayParts,
    orderBy: (orderBy as SortMethod) || SortMethod.recency,
    spirit: spirit.map((v) => parseInt(v)),
    groupsAction
  };
}

function numberOrNull(value: string | null) {
  if (value === null) {
    return null;
  }
  const n = parseInt(value, 10);

  if (isNaN(n)) {
    return null;
  }
  return n;
}

const dayPartToTimeInterval = (dayPart: string): [number, number] => {
  switch (dayPart) {
    case dayParts.morning:
      return [0, 1159];
    case dayParts.afternoon:
      return [1200, 1959];
    case dayParts.evening:
      return [2000, 2359];
    default:
      return [0, 2400];
  }
};

const reduceDayParts = (parts: [number, number][]): [number, number] => {
  const flattened: number[] = [];

  parts.map((p) => flattened.push(...p));
  let min = 2500;
  let max = 0;

  flattened.map((value) => {
    min = Math.min(value, min);
    max = Math.max(value, max);
    return value;
  });
  return [min, max];
};

async function search(
  dayParts: string[] | null,
  spirit: number[] | null,
  sport: number | null,
  searchedLocation: [number, number] | null,
  dayOfWeek: number | null,
  page: number,
  reset: boolean = true,
  userLocation: [number, number] | null,
  orderByProximity: boolean,
  showGroups: boolean
): Promise<ActionData> {
  const [lat, lng] = searchedLocation ? searchedLocation : [null, null];
  const filters = {
    spirit: spirit || null,
    sport: !sport || sport === -1 ? null : sport,
    dayOfWeek: dayOfWeek,
    timeOfDay:
      dayParts === null || dayParts.length === 0
        ? null
        : reduceDayParts(dayParts.map(dayPartToTimeInterval))
  };

  const { total, results } = await searchEventsAndGroups(
    lat,
    lng,
    filters,
    10,
    page,
    userLocation,
    orderByProximity,
    showGroups
  );

  return {
    results: results.map((g) => {
      return {
        ...g,
        distance: Math.floor(g.distance || 0) // save some bandwidth
      };
    }),
    total,
    filters,
    reset,
    page
  };
}

function useQueryString() {
  const searchString = useLocation()?.search;

  // parse the string in a useCreation so that the searchParse
  // object is not recreated on every render if the searchString doesn't change
  return useCreation(
    () => parseQueryString(`https://a.com/?${searchString}`),
    [searchString]
  );
}

export default function Index() {
  const { t, i18n } = useTranslation('home');
  const { user } = useRootData();
  const lang = i18n.language as Language;
  const tc = useTranslation('common').t;
  const {
    sports,
    groupsSpirit,
    searchResult,
    favoriteGroups,
    favoriteEvents,
    mapToken,
    selectedDayParts,
    latestEvents
  } = useLoaderData<LoaderData>() as unknown as LoaderData;
  const [selection, setSelection] = useState<DiciLocation | undefined>();
  const data = searchResult;
  const [searchResults, setSearchResults] = useState<Array<SearchResults>>(
    data?.results || []
  );
  const [filtersModalOpen, setFiltersModalOpen] = useState<boolean>(false);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(
    searchResults.length > 0
  );
  const [address, setAddress] = useState<string>('');
  const location = useLocation();
  const filters = useQueryString();
  const [userLocation, setUserLocation] = useUserLocation();
  const locationFetcher = useFetcher();
  const [searchingLocation, setSearchingLocation] = useState<boolean>(false);
  const [isLocationFailedWarningOpened, setLocationFailedWarningOpen] =
    useState<boolean>(false);
  const [orderBy, setOrderBy] = useState<SortMethod>(
    filters.orderBy
      ? filters.orderBy
      : userLocation
      ? SortMethod.proximity
      : SortMethod.recency
  );
  const searchForm = useRef<HTMLFormElement | null>(null);
  const [filtersCacheBurst, setFiltersCacheBurst] = useState<number>(
    Date.now()
  );

  const handleSearchLocations = useCallback(
    (o: DiciLocation | SyntheticEvent<HTMLSelectElement>) => {
      setSelection(o as DiciLocation);
    },
    []
  );

  const handleOnSubmit = useCallback(() => {
    setSearchPerformed(true);
    setFiltersModalOpen(false);
    setFiltersCacheBurst(Date.now());
  }, []);

  const handleCloseFilters = useCallback(() => {
    setFiltersModalOpen(false);
  }, []);

  useEffect(() => {
    if (!searchResult) {
      if (searchResults.length > 0) {
        // we get here when a user navigates back to the home page (by clicking dicisports, for instance)
        // after having performed a query with results
        setSearchResults([]);
        setSearchPerformed(false);
        setFiltersModalOpen(false);
      }
      return;
    }
    setSearchPerformed(true);

    const { reset, results } = searchResult;

    if (!results) {
      return;
    }

    // reset is used to keep previous groups when "load more results" is used
    const list = reset ? [] : [...searchResults];

    results.map((r) => list.push(r));
    setSearchResults(list);
    const url = new URL(window.location.href);

    setAddress(url.origin);

    // when people go back, remove search performed, to make sure the
    // grid of sports appears again
    window.onpopstate = handleResetSearchPerformed;
    return () => {
      window.onpopstate = null;
    };
  }, [searchResult]);

  const showMoreResults = !!data && searchResults.length < data.total;

  function handleOpenFilters() {
    setFiltersModalOpen(true);
  }

  function handleResetSearchPerformed() {
    setSearchPerformed(false);
  }

  function handleCloseLocationFailedWarning() {
    setLocationFailedWarningOpen(false);
  }

  function handleSetUsersLocation() {
    setSearchingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSearchingLocation(false);
        const { latitude, longitude } = position.coords;

        locationFetcher.submit(
          { latitude: String(latitude), longitude: String(longitude) },
          {
            method: 'post',
            action: '/action/set-my-location'
          }
        );

        setUserLocation([latitude, longitude]);

        // this is likely to cause issues... submitting the form can potentially
        // cancel the previous request before successfully completing, thus
        // causing the location not to be set
        searchForm.current?.submit();
      },
      (err) => {
        setSearchingLocation(false);
        setLocationFailedWarningOpen(true);
        console.log(err);
      }
    );
  }

  function handleOrderBy(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    if (!userLocation) {
      e.preventDefault();
      e.stopPropagation();
      handleSetUsersLocation();
    }
    setOrderBy(
      orderBy === SortMethod.proximity
        ? SortMethod.recency
        : SortMethod.proximity
    );
  }

  return (
    <Main className="dark:text-blueGray-500 relative mb-8">
      <TransitionIndicator
        visible={searchingLocation}
        action={t('Searching Location')}
      />
      <Form
        method="get"
        onSubmit={handleOnSubmit}
        autoComplete="off"
        preventScrollReset={true}
      >
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
        <input type="hidden" name="page" value={searchResult?.page || 0} />
        <input
          type="hidden"
          name="dow"
          value={
            filters?.dayOfWeek === null
              ? ''
              : (filters?.dayOfWeek as DaysOfWeek)
          }
        />
        <input type="hidden" name="sport" value={filters?.sport || ''} />
        {selectedDayParts &&
          selectedDayParts.map((p: string) => (
            <input key={p} type="hidden" name="daypart" value={p} />
          ))}
        {filters?.spirit &&
          filters.spirit.map((v) => (
            <input key={v} type="hidden" name="spirit" value={v} />
          ))}
        <input type="hidden" name="g" value={filters?.groupsAction || ''} />
        <div className="flex align-middle justify-center">
          <Link to="/" onClick={handleResetSearchPerformed}>
            <HomeLogo className="w-80 h-16 md:w-96 lg:w-144" />
          </Link>
        </div>
        <Spacer size="2xs" />
        <div className="flex align-middle justify-center items-center">
          <div className="flex flex-col w-full md:w-160 lg:flex-row">
            <SearchLocations
              onSelect={handleSearchLocations}
              placeholder={t('Search Placeholder')}
              className="px-0 mr-4 w-full search-select"
              mapToken={mapToken}
            />
            <Button
              name="actionId"
              value={actions.search}
              className="mt-8 w-80 m-auto lg:mt-0 lg:w-auto lg:m-0"
              id="search-button"
            >
              {t('Search')}
            </Button>
          </div>
        </div>
        <FiltersDialog
          key={filtersCacheBurst}
          isOpen={filtersModalOpen}
          sports={sports}
          groupsSpirit={groupsSpirit}
          triggerModalClose={handleCloseFilters}
          onSubmit={handleOnSubmit}
          // we need to pass all the filters because filters dialog will submit its own form
          filters={filters}
          coords={selection ? selection.coords : ''}
          search={selection ? selection.address : ''}
          order={orderBy}
          lang={lang}
        />

        {searchPerformed && (
          <>
            <Spacer size="xs" />
            <div className="pl-6 flex align-middle">
              <Button
                size="small"
                onClick={handleOpenFilters}
                type="button"
                name="filters"
              >
                <AdjustmentsVerticalIcon className="h-6" />
              </Button>
              <div
                className="flex mx-2 items-center dark:text-white text-blueGray-500 text-sm"
                data-cy="total-results"
              >
                {data?.total
                  ? t('Number of Results Found', { total: data?.total })
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
          </>
        )}

        {showMoreResults && (
          <>
            <div className="inset-x-0 mb-8 flex align-middle justify-center absolute bottom-0 w-full">
              <Button
                id="see-more"
                name="actionId"
                value={actions.more}
                formMethod="get"
              >
                <ChevronDownIcon width="22" /> {t('Load More')}
              </Button>
            </div>
          </>
        )}

        {searchPerformed && (
          <div className="flex flex-col justify-center">
            {searchResults.length === 0 ? (
              <div className="w-full flex justify-center mt-8">
                <CallToActionToCreateGroup
                  className="text-xl"
                  label={t('No Groups Found - Create yours')}
                />
              </div>
            ) : (
              <>
                <Spacer size="3xs" />
                <div className="flex align-middle justify-center">
                  <CallToActionToCreateGroup label={t('Create your group')} />
                </div>
                <Spacer size="2xs" />
                <div className="flex justify-end">
                  <input type="hidden" name="order" value={orderBy} />
                  <button
                    className="background-transparent text-orange-600 dark:text-blueGray-500 font-medium"
                    name="actionId"
                    value={actions.sort}
                    onClick={handleOrderBy}
                    id="sort-location"
                  >
                    {orderBy === SortMethod.proximity
                      ? t('Order by recency')
                      : t('Order by proximity')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Form>

      {searchPerformed && (
        <>
          {searchResults.map((r, index) =>
            r.entity === 'event' ? (
              <EventResult
                key={r.id}
                event={r}
                img={sports.find((s) => s.id === r.sportId)?.picture}
                userLocation={userLocation}
                showLocation={orderBy === SortMethod.proximity}
                isUserFavorite={
                  favoriteEvents.find((e) => e.id === r.id) !== undefined
                }
              />
            ) : (
              <GroupResult
                group={r}
                key={`${r.id}-${index}`}
                isUserFavorite={
                  favoriteGroups.find((g: Group) => g.id === r.id) !== undefined
                }
                img={sports.find((s: Sport) => s.id === r.sportId)?.picture}
                favAddedMessage={t('Favorite Added')}
                favRemovedMessage={t('Favorite Removed')}
                copiedToClipMessage={t('Copied to Clipboard')}
                address={address}
                location={`${location.pathname}${location.search}`}
                isLoggedIn={user !== null}
                userLocation={userLocation}
                showLocation={orderBy === SortMethod.proximity}
              />
            )
          )}
        </>
      )}

      {!searchPerformed && (
        <>
          {latestEvents.length > 0 && (
            <>
              <LatestEvents events={latestEvents} />
              <div className="w-full md:max-w-5xl m-auto mb-4 mt-12 text-xl dark:text-white font-bold">
                {t('Sports Grid Header')}
              </div>
            </>
          )}
          {latestEvents.length === 0 && <Spacer size="3xs" />}
          <SportsGrid sports={sports} lang={lang} />
        </>
      )}

      <Dialog
        onClose={handleCloseLocationFailedWarning}
        isOpen={isLocationFailedWarningOpened}
        aria-label="Location Failed"
        SecondaryAction={
          <Button
            size="medium"
            type="button"
            onClick={handleCloseLocationFailedWarning}
          >
            {t('Failed to find Your Location Close')}
          </Button>
        }
      >
        <H5 className="mb-4">{t('Failed to find Your Location Title')}</H5>
        <Paragraph>{t('Failed to find Your Location Hint')}</Paragraph>
        <Spacer size="2xs" />
      </Dialog>
    </Main>
  );
}

function LatestEvents({ events }: { events: Event[] }) {
  const { t, i18n } = useTranslation('home');

  return (
    <>
      <div className="w-full md:max-w-5xl m-auto mb-4 mt-12 text-xl dark:text-white font-bold capitalize">
        {t('Latest Events')}
      </div>
      <div
        className={`w-full mb-12 m-auto gap-2 md:max-w-5xl grid-cols-1 md:grid-cols-4
        grid grid-flow-row md:grid-flow-row md:grid-rows-${Math.ceil(
          events.length / 4
        )}`}
      >
        {events.map(
          ({ id, image1, image2, image3, image4, image5, slug, name }) => (
            <Link
              key={id}
              className="relative transition ease-in-out delay-150 hover:-translate-y-1 md:hover:scale-110 duration-300"
              to={`/${i18n.language}/event/${slug}`}
            >
              <DisplayImg
                className="w-full md:w-56 hover:resize"
                dontMessWithImgSize={true}
                imageId={image1 || image2 || image3 || image4 || image5 || ''}
                alt={name || ''}
                transformations={{
                  resize: {
                    type: 'fill',
                    width: 400,
                    height: 400
                  }
                }}
              />
              <span
                className={`w-full md:w-56 absolute top-0 left-0 p-2 rounded-t-lg align-middle
                text-ellipsis overflow-hidden truncate
                bg-gray-800 bg-opacity-80 text-white text-bold text-blueGray-300`}
              >
                {name}
              </span>
            </Link>
          )
        )}
      </div>
      <div className="flex justify-center">
        <ButtonLink to="/?coords=&search=&order=recent&actionId=search&sport=&dow=&value=&g=hide">
          {t('View all events')}
        </ButtonLink>
      </div>
    </>
  );
}

function CallToActionToCreateGroup({
  label,
  className
}: {
  label: string;
  className?: string;
}) {
  return (
    <Link
      to="/g/group/add"
      className={clsx(
        'background-transparent text-orange-600 dark:text-blueGray-500 font-medium',
        className
      )}
      id="create-your-group"
    >
      {label}
    </Link>
  );
}
