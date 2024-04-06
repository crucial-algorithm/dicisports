import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  Form,
  Link,
  useLoaderData,
  useLocation,
  useSubmit
} from '@remix-run/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Event } from '@prisma/client';
import {
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  MapPinIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import { ClockIcon } from '@heroicons/react/24/outline';
import { ToggleButton } from 'primereact/togglebutton';
import { useCreation } from 'ahooks';

import EventResult from '~/components/SearchEventResult';
import DisplayImg from '~/components/shared/DisplayImg';

import Button, { ButtonLink } from '~/components/shared/Button';
import Main from '~/components/shared/Main';
import { Spacer } from '~/components/shared/Spacer';
import type { SearchEventResult } from '~/server/db/search.server';
import { searchEvents } from '~/server/db/search.server';
import type { EventFilters, Language, Sport } from '~/types';

import HomeLogo from '~/components/shared/HomeLogo';
import { getUser } from '~/server/auth/session.server';

import { CanonicalMeta } from '~/utils/seo';

import { getI18nText } from '~/components/I18nText';
import type { LocationInPicker } from '~/components/LocationPickerDialog';
import LocationPickerDialog, {
  mapValueToLocationInPicker,
  PT_REGIONS
} from '~/components/LocationPickerDialog';
import SearchEvents from '~/components/SearchEvents';
import SportsPickerDialog from '~/components/SportsPickerDialog';
import ButtonTriState from '~/components/shared/ButtonTriState';
import DisplayDate from '~/components/shared/DIsplayDate';
import { useRootData } from '~/hooks';
import {
  findFeaturedEvents,
  findLatestPublishedEvents,
  findRegionsWithEvents,
  findUserFavoriteEvents
} from '~/server/db/events.server';
import { H5 } from '~/components/shared/typography';
import ComboBox from '~/components/shared/form/ComboBox';
import { getLocalizedText } from '~/utils/misc';

type TimedEventFilter = null | 'included' | 'excluded';

type FilterParams = {
  actionId: keyof typeof actions | null;
  region: LocationInPicker | null;
  timedEvents: TimedEventFilter;
  page: number | null;
  sport: number | null;
};

type LoaderData = {
  searchResult: ActionData;
  favoriteEvents: Event[];
  latestEvents: Event[];
  featuredEvent: Event | null;
  regions: { region: string; events: number }[];
};

type ActionData = {
  results: SearchEventResult[];
  filters: EventFilters | null;
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
  const favoriteEvents = user ? await findUserFavoriteEvents(user.id) : [];
  let latestEvents: Event[] = [];
  let featuredEvent: Event | null = null;

  let result: ActionData | null = null;
  const page = data.actionId === actions.search ? 0 : data.page || 0;

  if (data.actionId === actions.search || data.actionId === actions.more) {
    result = await search(
      data.region?.value || null,
      data.timedEvents,
      data.sport,
      actions.more === data.actionId ? page + 1 : page,
      data.actionId !== actions.more
    );
  } else {
    latestEvents = await findLatestPublishedEvents();
    const featuredEvents = await findFeaturedEvents();

    if (featuredEvents.length > 0) {
      featuredEvent =
        featuredEvents[Math.floor(Math.random() * featuredEvents.length)];
    }
  }

  return json({
    searchResult: result,
    favoriteEvents,
    latestEvents,
    featuredEvent: featuredEvent || null,
    regions: await findRegionsWithEvents()
  } as LoaderData);
};

export default function Index() {
  const { sports } = useRootData();
  const { t, i18n } = useTranslation('home');
  const { searchResult, favoriteEvents, latestEvents, featuredEvent, regions } =
    useLoaderData<LoaderData>() as unknown as LoaderData;
  const [searchResults, setSearchResults] = useState<SearchEventResult[]>(
    searchResult?.results || []
  );
  const [searchPerformed, setSearchPerformed] = useState<boolean>(
    searchResults.length > 0
  );

  const filters = useQueryString();
  const [timedEventFilter, setTimedEventFilter] = useState<TimedEventFilter>(
    filters.timedEvents
  );
  const [selectinglocation, setSelectingLocation] = useState<boolean>(false);
  const [location, setLocation] = useState<LocationInPicker | null>(
    filters.region
  );
  const [selectingSport, setSelectingSport] = useState<boolean>(false);
  const [sport, setSport] = useState<Sport | null>(
    filters.sport ? sports.find((s) => s.id === filters.sport) || null : null
  );

  const handleOnSubmit = useCallback(() => {
    setSearchPerformed(true);
  }, []);

  useEffect(() => {
    if (!searchResult) {
      return;
    }

    setSearchPerformed(true);

    const { reset, results } = searchResult;

    if (!results) {
      return;
    }

    // reset is used to signal if we should clear or keep previous events (for when "load more results" is used)
    const list = reset ? [] : [...searchResults];

    results.map((r) => list.push(r));
    setSearchResults(list);

    // when people go back, remove search performed, to make sure the
    // grid of sports appears again
    window.onpopstate = handleResetSearchPerformed;
    return () => {
      window.onpopstate = null;
    };
  }, [searchResult]);

  useEffect(() => {
    if (!searchResult && searchResults.length > 0) {
      // we get here when a user navigates back to the home page (by clicking dicisports, for instance)
      // after having performed a query with results
      setSearchResults([]);
      setSearchPerformed(false);
      return;
    }
  }, [searchResult, searchResults.length]);

  const showMoreResults =
    !!searchResult && searchResults.length < searchResult.total;

  const submit = useSubmit();

  function handleResetSearchPerformed() {
    setSearchPerformed(false);
  }

  function handleOpenLocationDialog() {
    setSelectingLocation(true);
  }

  function handleApplyLocation(loc: LocationInPicker | null) {
    setLocation(loc);
    setSelectingLocation(false);
    submit(gatherFormData('region', loc?.value || ''));
  }

  function handleApplyLocationDesktop(loc: string | number) {
    handleApplyLocation(PT_REGIONS.find((r) => r.value === loc) || null);
  }

  function handleCloseLocationDialog() {
    setSelectingLocation(false);
  }

  function handleOpenSportsDialog() {
    setSelectingSport(true);
  }

  function handleApplySport(sport: Sport | null) {
    setSport(sport);
    setSelectingSport(false);
    submit(gatherFormData('sport', String(sport?.id || '')));
  }

  function handleApplySportDesktop(sport: number | string | null) {
    handleApplySport(sports.find((s) => s.id === Number(sport)) || null);
  }

  function handleCloseSportsDialog() {
    setSelectingSport(false);
  }

  function handleTimedEventsFilter(o: true | false | null | undefined) {
    const v = map3StateToTimed(o);

    setTimedEventFilter(v);
    submit(gatherFormData('timed', v || ''));
  }

  function gatherFormData(property: string, value: string) {
    const formData = new FormData();
    const values: { [key: string]: string } = {
      region: location?.value || '',
      page: String(searchResult?.page || 0),
      sport: String(sport?.id || ''),
      timed: String(timedEventFilter || ''),
      actionId: 'search'
    };

    values[property] = value;

    Object.entries(values).map(([k, v]) => formData.append(k, v));
    return formData;
  }

  return (
    <Main className="dark:text-blueGray-500 relative mb-8">
      <Form
        method="get"
        onSubmit={handleOnSubmit}
        autoComplete="off"
        preventScrollReset={true}
      >
        <input type="hidden" name="region" value={location?.value || ''} />
        <input type="hidden" name="page" value={searchResult?.page || 0} />
        <input type="hidden" name="sport" value={sport?.id || ''} />
        <input type="hidden" name="timed" value={timedEventFilter || ''} />

        <div className="flex align-middle justify-center">
          <Link to="/" onClick={handleResetSearchPerformed}>
            <HomeLogo className="w-80 h-16 md:w-96 lg:w-144" />
          </Link>
        </div>

        <Spacer size="2xs" />
        <div className="flex align-middle justify-center items-center">
          <div className="flex flex-col w-full md:w-160 lg:flex-row">
            <SearchEvents
              placeholder={t('Search Event Placeholder')}
              className="px-0 mr-4 w-full search-select"
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
      </Form>

      {searchPerformed && (
        <>
          <div className="w-full m-auto my-4 flex flex-nowrap overflow-x-scroll hide-scroll-bar lg:hidden">
            <div className="relative gap-2 flex flex-nowrap ml-6 md:ml-0">
              <ToggleButton
                onLabel={
                  sport === null
                    ? t('Event Filters: All Sports')
                    : getI18nText(sport?.name, i18n.language as Language)
                }
                offLabel={t('Event Filters: All Sports')}
                onIcon="pi pi-times"
                offIcon="pi pi-angle-down"
                checked={sport !== null}
                onChange={handleOpenSportsDialog}
                className="ds min-w-32"
              />

              <ToggleButton
                onLabel={
                  location === null
                    ? t('Event Filters: Location')
                    : location?.label
                }
                offLabel={t('Event Filters: Location')}
                onIcon="pi pi-times"
                offIcon="pi pi-angle-down"
                checked={location !== null}
                onChange={handleOpenLocationDialog}
                className="ds min-w-32"
              />

              <ButtonTriState
                labels={{
                  checked: t('Event Filters: Classification'),
                  unchecked: t('Event Filters: No Classification'),
                  indeterminate: t('Event Filters: Results')
                }}
                icons={{
                  checked: <ClockIcon className="h-6" />,
                  unchecked: <ClockIcon className="h-6" />,
                  indeterminate: <ClockIcon className="h-6" />
                }}
                selectionState={mapTimedTo3State(timedEventFilter)}
                onChange={handleTimedEventsFilter}
                className="ds min-w-44"
              />
            </div>
          </div>

          <div className="hidden lg:flex px-4 my-4 flex flex-nowrap items-center gap-4">
            <ComboBox
              name="sport-ignored"
              placeholder={t('Event Filters: All Sports')}
              value={sport?.id}
              options={sports.map(({ id, name }) => ({
                value: id,
                label: getI18nText(name, i18n.language as Language) || ''
              }))}
              onChange={handleApplySportDesktop}
              className="min-w-52 w-fit-content"
              defaultValue={sport?.id}
              clearOption={true}
            />
            <ComboBox
              name="region-ignored"
              placeholder={t('Event Filters: Location')}
              value={location?.value}
              options={PT_REGIONS.map(({ label, value }) => ({
                value,
                label,
                disabled: !regions.find((r) => r.region === value)
              }))}
              onChange={handleApplyLocationDesktop}
              className="min-w-52 w-fit-content"
              defaultValue={location?.value}
              clearOption={true}
            />

            <ButtonTriState
              labels={{
                checked: t('Event Filters: Classification'),
                unchecked: t('Event Filters: No Classification'),
                indeterminate: t('Event Filters: Results')
              }}
              icons={{
                checked: <CheckIcon className="h-6" />,
                unchecked: <XMarkIcon className="h-6" />,
                indeterminate: <ClockIcon className="h-6" />
              }}
              selectionState={mapTimedTo3State(timedEventFilter)}
              onChange={handleTimedEventsFilter}
              className="ds min-w-32 min-h-[60px] mt-1"
            />
          </div>
        </>
      )}

      {searchPerformed && searchResults.length === 0 && (
        <H5 className="text-center mt-8 lg:max-w-lg lg:m-auto lg:mt-8">
          {t('No events found')}
        </H5>
      )}

      {searchPerformed && (
        <>
          {searchResults.map((r, index) => (
            <EventResult
              key={r.id}
              event={r}
              img={sports.find((s) => s.id === r.sportId)?.picture}
              userLocation={null}
              showLocation={false}
              isUserFavorite={
                favoriteEvents.find((e) => e.id === r.id) !== undefined
              }
            />
          ))}
        </>
      )}

      {!searchPerformed && (
        <>
          {featuredEvent && (
            <>
              <FeaturedEvent event={featuredEvent} />
            </>
          )}

          {latestEvents.length > 0 && (
            <LatestEvents
              events={latestEvents}
              title={t('Latest Events')}
              showViewAll={true}
            />
          )}
        </>
      )}

      {!searchPerformed && <Categories sports={sports} />}

      <LocationPickerDialog
        isOpen={selectinglocation}
        triggerClose={handleCloseLocationDialog}
        onLocationPicked={handleApplyLocation}
        title={t('Select location')}
        location={location?.label || null}
        locations={regions}
      />

      <SportsPickerDialog
        isOpen={selectingSport}
        triggerClose={handleCloseSportsDialog}
        onSportPicked={handleApplySport}
        title={t('Select sport')}
        sport={sport}
      />
    </Main>
  );

  function Categories({ sports }: { sports: Sport[] }) {
    const { t, i18n } = useTranslation('home');

    function handleFilterSport(e: React.MouseEvent<HTMLSpanElement>) {
      handleApplySport(sports.find((s) => s.id === Number(e.currentTarget.id)) || null);
    }

    return (
      <>
        <div className="w-full lg:w-9/12 m-auto mb-4 mt-12 text-xl dark:text-white font-bold capitalize">
          {t('Categories')}
        </div>

        <div className="w-full m-auto lg:w-9/12 flex overflow-x-scroll hide-scroll-bar">
          <div className="relative flex flex-nowrap ml-6 md:ml-0">
          {sports
            .sort((a, b) => a.id - b.id)
            .map((s) => (
              <span
                onClick={handleFilterSport}
                key={s.id}
                id={String(s.id)}
                className="relative min-w-[160px] mx-1 border border-transparent hover:brightness-110"
              >
                <DisplayImg
                  imageId={`product/sports/${s.picture}`}
                  key={s.id}
                  alt={getLocalizedText(i18n.language as Language, s.name)}
                  dontMessWithImgSize={true}
                  className="w-full md:w-56 hover:resize"
                  variant="Grid"
                />
              </span>
            ))}
          </div>
        </div>
      </>
    );
  }
}

function LatestEvents({
  events,
  title,
  showViewAll
}: {
  events: Event[];
  title: String;
  showViewAll: boolean;
}) {
  const { t, i18n } = useTranslation('home');

  return (
    <>
      <div className="w-full lg:w-9/12 m-auto mb-4 mt-12 text-xl dark:text-white font-bold capitalize">
        {title}
      </div>
      <div className="w-full m-auto lg:w-9/12 flex overflow-x-scroll hide-scroll-bar">
        <div className="relative flex flex-nowrap ml-6 md:ml-0">
          {events.map(
            ({ id, image1, image2, image3, image4, image5, slug, name }) => (
              <Link
                key={id}
                className="relative min-w-[220px] mx-1 border border-transparent hover:brightness-110"
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
                  className={`w-full absolute top-0 left-0 p-2 rounded-t-lg align-middle border-x-2 mx-0 border-transparent
                text-ellipsis overflow-hidden truncate
                bg-gray-800 bg-opacity-80 text-white text-bold text-blueGray-300`}
                >
                  {name}
                </span>
              </Link>
            )
          )}
        </div>
      </div>
      {showViewAll && (
        <div className="flex justify-center mt-6">
          <ButtonLink to="/?coords=&search=&order=recent&actionId=search&sport=&dow=&value=&g=hide">
            {t('View all events')}
          </ButtonLink>
        </div>
      )}
    </>
  );
}

function FeaturedEvent({ event }: { event: Event }) {
  const { t, i18n } = useTranslation('home');
  const { slug, name, description, startAt } = event;

  // @ts-ignore
  const location: undefined | { place: string } = event.location;
  const [img1, img2, img3] = [
    event.image1,
    event.image2,
    event.image3,
    event.image4,
    event.image5
  ].filter(Boolean);

  return (
    <div className="w-full lg:w-9/12 m-auto py-6 px-4 sm:p-6 md:py-10 md:px-8 rounded-lg mt-8 bg-gray-100 dark:bg-gray-700">
      <div className="max-w-4xl mx-auto grid grid-cols-4 col-span-full">
        <div className="col-start-1 col-span-full row-start-1 md:row-start-2 md:p-0 lg:row-start-2 relative p-3 flex flex-col-reverse rounded-lg bg-gradient-to-t from-black/75 via-black/0 md:bg-none">
          <h1 className="mt-1 text-lg font-semibold text-white md:text-gray-700">
            {name}
          </h1>
        </div>

        <div className="col-start-1 col-span-full row-start-1 grid gap-4 grid-cols-4 md:gap-2">
          <DisplayImg
            className="w-full h-60 object-cover rounded-lg col-start-1 col-span-full md:col-span-2"
            dontMessWithImgSize={true}
            imageId={img1}
            alt={name || ''}
            transformations={{
              resize: {
                type: 'fill',
                width: 400,
                height: 400
              }
            }}
          />
          <DisplayImg
            className="hidden w-full h-60 object-cover rounded-lg md:block md:col-start-3 md:col-span-2 lg:col-span-1"
            dontMessWithImgSize={true}
            imageId={img2}
            alt={name || ''}
            transformations={{
              resize: {
                type: 'fill',
                width: 400,
                height: 400
              }
            }}
          />
          <DisplayImg
            className="hidden w-full h-52 object-cover rounded-lg lg:block lg:col-start-4"
            dontMessWithImgSize={true}
            imageId={img3}
            alt={name || ''}
            transformations={{
              resize: {
                type: 'fill',
                width: 400,
                height: 400
              }
            }}
          />
        </div>

        <dl className="col-start-1 col-span-full row-start-2 mt-4 md:mt-0 text-xs font-medium text-slate-400 flex items-center md:row-start-3">
          <dt className="sr-only">When</dt>
          <dd className="flex items-center mr-2">
            <MapPinIcon className="h-6 w-6 m-0 inline-block" />
            <span>{location && location.place && <>{location.place}</>}</span>
          </dd>
          <dt className="sr-only">Location</dt>
          <dd className="flex items-center">
            <CalendarDaysIcon className="h-6 w-6 mr-1 inline-block" />
            <DisplayDate date={new Date(startAt || 0)} />
          </dd>
        </dl>

        <div className="row-start-3 col-start-1 md:row-start-2 md:col-start-4 md:row-span-2 mt-4 self-center">
          <ButtonLink to={`/${i18n.language}/event/${slug}`}>
            {t('View full event')}
          </ButtonLink>
        </div>

        <div
          className="col-start-1 col-span-full max-h-64 mt-4 text-sm leading-6 dark:text-slate-400"
          dangerouslySetInnerHTML={{
            __html:
              description && description?.length > 300
                ? description.slice(0, 300) + ' ...'
                : description || '...'
          }}
        />
      </div>
    </div>
  );
}

function map3StateToTimed(
  o: true | false | null | undefined
): TimedEventFilter {
  // true: include only events with results
  // false: exclude events with results
  // null: whatever (default)
  return o === null ? null : o ? 'included' : 'excluded';
}

function mapTimedTo3State(
  o: TimedEventFilter
): true | false | null | undefined {
  return o === null ? null : o === 'included';
}

function mapUrlParamToTimed(v: string | null): TimedEventFilter {
  return v === 'included' ? 'included' : v === 'excluded' ? 'excluded' : null;
}

function parseQueryString(url: string): FilterParams {
  const { searchParams } = new URL(url);
  const actionId = searchParams.get('actionId') as keyof typeof actions;
  const page = numberOrNull(searchParams.get('page'));
  const sport = numberOrNull(searchParams.get('sport'));
  const timedEvents = mapUrlParamToTimed(searchParams.get('timed'));
  const region = mapValueToLocationInPicker(searchParams.get('region'));

  return {
    region,
    timedEvents,
    actionId,
    page,
    sport
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

async function search(
  region: string | null,
  timedEvents: TimedEventFilter,
  sport: number | null,
  page: number,
  reset: boolean = true
): Promise<ActionData> {
  const filters: EventFilters = {
    sport: !sport || sport === -1 ? null : sport,
    region,
    timedEvents
  };

  const { total, results } = await searchEvents(filters, 10, page);

  return {
    results,
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
    () => parseQueryString(`https://a.com/${searchString}`),
    [searchString]
  );
}
