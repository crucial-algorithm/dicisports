import type { SyntheticEvent } from 'react';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { LoaderFunction, MetaFunction } from 'remix';
import { json } from 'remix';
import {
  Form,
  Link,
  useFetcher,
  useLoaderData,
  useLocation
} from '@remix-run/react';
import { useTranslation } from 'react-i18next';

import {
  AdjustmentsVerticalIcon,
  ChevronDownIcon,
  HeartIcon as Favorite,
  ShareIcon
} from '@heroicons/react/24/solid';

import { HeartIcon, XCircleIcon } from '@heroicons/react/24/outline';

import clsx from 'clsx';

import type { TFunction } from 'i18next';

import { CopyToClipboard } from 'react-copy-to-clipboard';

import { Dialog } from '@reach/dialog';

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
  Sport
} from '~/types';
import { findGroups } from '~/server/db/locations.server';
import GroupEntry from '~/components/GroupEntry';

import SearchLocations from '~/components/SearchLocations';
import ButtonGroup from '~/components/shared/ButtonGroup';

import { H3, Paragraph } from '~/components/shared/typography';
import FormField from '~/components/shared/form/FormField';
import CheckBox from '~/components/shared/form/CheckBox';
import { findGroupsSpirit } from '~/server/db/groupsSpirit.server';
import { findSports } from '~/server/db/sports.server';
import type { Option } from '~/components/shared/form/ComboBox';
import ComboBox from '~/components/shared/form/ComboBox';

import { getLocalizedText, PeekDayOfWeek } from '~/utils/misc';

import HomeLogo from '~/components/shared/HomeLogo';
import DisplayImg from '~/components/shared/DisplayImg';
import { findUserFavoriteGroups } from '~/server/db/groups.server';
import { getUser } from '~/server/auth/session.server';
import { Notification } from '~/components/shared/NotificationMessage';

import Config from '~/server/config.server';
import TransitionIndicator from '~/components/shared/TransitionIndicator';
import WhatsApp from '~/components/shared/icons/WhatsApp';
import { useRootData } from '~/utils/use-root-data';
import { getLocationSession } from '~/routes/action/set-my-location';
import { useUserLocation } from '~/utils/LocationProvider';
import { CanonicalMeta } from '~/utils/seo';

type FilterParams = {
  actionId: keyof typeof actions | null;
  coords: string | null;
  search: string | null;
  spirit: number[] | null;
  dayParts: string[] | null;
  page: number | null;
  sport: number | null;
  dayOfWeek: number | null;
  orderBy: SortMethod;
};

type LoaderData = {
  sports: Sport[];
  groupsSpirit: GroupSpirit[];
  result: ActionData;
  favorites: Group[];
  mapToken: string;
};

type ActionData = {
  results: Group[];
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
  i18n: ['common', 'home', 'm-groups']
};

enum SortMethod {
  recency = 'recent',
  proximity = 'proximity'
}

export const meta: MetaFunction = CanonicalMeta;

export const loader: LoaderFunction = async ({ request, params, context }) => {
  const data = parseQueryString(request.url);
  // Initial load
  const user = await getUser(request);
  const favorites = user ? await findUserFavoriteGroups(user.id) : [];

  let result: ActionData | null = null;
  const page = data.page || 0;

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
      data.dayOfWeek || -1,
      data.actionId === actions.more ? page + 1 : page,
      data.actionId !== actions.more,
      !isNaN(Number(lat)) ? [Number(lat), Number(lng)] : null,
      data.orderBy === SortMethod.proximity
    );
  }

  const { MAPBOX_TOKEN } = Config();

  return json({
    sports: await findSports(),
    groupsSpirit: await findGroupsSpirit(),
    favorites,
    result,
    mapToken: MAPBOX_TOKEN
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

  return {
    actionId,
    coords,
    search,
    page,
    sport,
    dayOfWeek,
    dayParts: dayParts,
    orderBy: (orderBy as SortMethod) || SortMethod.recency,
    spirit: spirit.map((v) => parseInt(v))
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
  dayOfWeek: number,
  page: number,
  reset: boolean = true,
  userLocation: [number, number] | null,
  orderByProximity: boolean
): Promise<ActionData> {
  const [lat, lng] = searchedLocation ? searchedLocation : [null, null];
  const filters = {
    spirit: spirit || null,
    sport: !sport || sport === -1 ? null : sport,
    dayOfWeek: dayOfWeek === -1 ? null : dayOfWeek,
    timeOfDay:
      dayParts === null || dayParts.length === 0
        ? null
        : reduceDayParts(dayParts.map(dayPartToTimeInterval))
  };
  const { total, results } = await findGroups(
    lat,
    lng,
    filters,
    10,
    page,
    userLocation,
    orderByProximity
  );

  return {
    results: results.map((g, index) => {
      return {
        ...g,
        position: index,
        distance: Math.floor(g.distance || 0) // save some bandwidth
      };
    }),
    total,
    filters,
    reset,
    page
  };
}

export default function Index() {
  const { t, i18n } = useTranslation('home');
  const { user } = useRootData();
  const lang = i18n.language as Language;
  const tc = useTranslation('common').t;
  const { sports, groupsSpirit, result, favorites, mapToken } =
    useLoaderData<LoaderData>();
  const [selection, setSelection] = useState<DiciLocation | undefined>();
  const data = result;
  const [page, setPage] = useState<number>(data?.page || 0);
  const [groups, setGroups] = useState<Array<Group & { position: number }>>([]);
  const [filtersModalOpen, setFiltersModalOpen] = useState<boolean>(false);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [address, setAddress] = useState<string>('');
  const location = useLocation();
  const filters = parseQueryString(`https://a.com/${location.search}`);
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

  useEffect(() => {
    if (!result) {
      if (groups.length > 0) {
        setGroups([]);
        setSearchPerformed(false);
        setFiltersModalOpen(false);
      }
      return;
    }
    setSearchPerformed(true);

    const { reset, results } = result as ActionData;

    if (reset) {
      setPage(0);
    }
    if (!results) {
      return;
    }
    const list = reset ? [] : [...groups];

    results.map((r, index) => list.push({ ...r, position: index }));
    setGroups(list);
    const url = new URL(window.location.href);

    setAddress(url.origin);

    // when people go back, remove search performed, to make sure the
    // grid of sports appears again
    window.onpopstate = handleResetSearchPerformed;
    return () => {
      window.onpopstate = null;
    };
  }, [result, location]);

  const showMoreResults = !!data && data.results.length < data.total;

  function handleOnSubmit() {
    setSearchPerformed(true);
    setFiltersModalOpen(false);
  }

  function handleSearchLocations(
    o: DiciLocation | SyntheticEvent<HTMLSelectElement>
  ) {
    setSelection(o as DiciLocation);
  }

  function handleOpenFilters() {
    setFiltersModalOpen(true);
  }

  function handleCloseFilters() {
    setFiltersModalOpen(false);
  }

  function handleLoadNextPage() {
    setPage(page + 1);
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
            <HomeLogo className="w-80 h-16 md:w-96 lg:w-144" />
          </Link>
        </div>
        <Spacer size="2xs" />
        <div className="flex align-middle justify-center">
          <div className="flex flex-col w-full md:w-160 lg:flex-row">
            <SearchLocations
              ariaLabel={t('Search')}
              onSelect={handleSearchLocations}
              placeholder={t('Search Placeholder')}
              className="px-0 mr-4 w-full search-select"
              mapToken={mapToken}
            />
            <Button
              name="actionId"
              value={actions.search}
              className="mt-8 w-80 m-auto lg:mt-0 lg:w-auto lg:m-0"
            >
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
        {searchPerformed ? (
          <>
            <Spacer size="xs" />
            <div className="pl-6 flex align-middle">
              <Button size="small" onClick={handleOpenFilters} type="button">
                <AdjustmentsVerticalIcon className="h-6" />
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
          </>
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

        {searchPerformed && (
          <div className="flex flex-col justify-center">
            {groups.length === 0 ? (
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
          {groups.map((group) => (
            <GroupResult
              group={group}
              key={`${group.id}-${group.position}`}
              isUserFavorite={
                favorites.find((g: Group) => g.id === group.id) !== undefined
              }
              img={sports.find((s: Sport) => s.id === group.sportId)?.picture}
              favAddedMessage={t('Favorite Added')}
              favRemovedMessage={t('Favorite Removed')}
              copiedToClipMessage={t('Copied to Clipboard')}
              address={address}
              location={`${location.pathname}${location.search}`}
              isLoggedIn={user !== null}
              userLocation={userLocation}
              showLocation={orderBy === SortMethod.proximity}
            />
          ))}
        </>
      )}

      {!searchPerformed ? (
        <>
          <Spacer size="3xs" />
          <SportsGrid sports={sports} lang={lang} t={t} />
        </>
      ) : null}

      <Dialog
        onDismiss={handleCloseLocationFailedWarning}
        isOpen={isLocationFailedWarningOpened}
        aria-label="Delete your account"
        className="w-11/12 dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg lg:px-24 lg:py-14 lg:max-w-screen-lg"
      >
        <H3 className="mb-4">{t('Failed to find Your Location Title')}</H3>
        <Paragraph>{t('Failed to find Your Location Hint')}</Paragraph>
        <Spacer size="2xs" />
        <div className="flex flex-wrap gap-4 justify-end">
          <Button
            variant="danger"
            size="medium"
            type="button"
            onClick={handleCloseLocationFailedWarning}
          >
            {t('Failed to find Your Location Close')}
          </Button>
        </div>
      </Dialog>
    </Main>
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
    <Form method="post" action="/m/group/add">
      <input type="hidden" name="actionId" value="create" />
      <button
        className={clsx(
          'background-transparent text-orange-600 dark:text-blueGray-500 font-medium',
          className
        )}
      >
        {label}
      </button>
    </Form>
  );
}

function GroupResult({
  group,
  img,
  isUserFavorite,
  favAddedMessage,
  favRemovedMessage,
  copiedToClipMessage,
  address,
  location,
  isLoggedIn,
  userLocation,
  showLocation
}: {
  group: Group;
  img?: string;
  isUserFavorite: boolean;
  favAddedMessage: string;
  favRemovedMessage: string;
  copiedToClipMessage: string;
  address: string;
  location: string;
  isLoggedIn: boolean;
  userLocation: [number, number] | null;
  showLocation: boolean;
}) {
  const favorite = useFetcher();
  const ref = useRef();
  const [message, setMessage] = useState<string>(favAddedMessage);
  let showFavoriteAddedNotification: any = null;
  let showCopiedToClipboardNotification: any = null;

  function handlerSetShowNotificationFunction(callback: () => void) {
    showFavoriteAddedNotification = callback;
  }

  function handlerSetShowNotificationCopyToClipboard(callback: () => void) {
    showCopiedToClipboardNotification = callback;
  }

  function handlerClickToCopy() {
    showCopiedToClipboardNotification();
  }

  useEffect(() => {
    if (favorite.type === 'done' && favorite.data.ok) {
      if (ref.current) {
        (ref.current as HTMLFormElement).reset();
      }
      setMessage(
        favorite.data.action === 'add' ? favAddedMessage : favRemovedMessage
      );
      showFavoriteAddedNotification();
    }
  }, [
    favorite,
    favAddedMessage,
    favRemovedMessage,
    showFavoriteAddedNotification
  ]);

  const whatsAppLink = isLoggedIn
    ? group.whatsapp || ''
    : `/login?a=ws&g=${group.id}&l=${location}`;

  return (
    <>
      <GroupEntry
        group={group}
        key={group.id}
        img={img}
        actions={
          <ButtonGroup density="compact">
            {group.whatsapp && (
              <ButtonLink size="tiny" type="button" to={whatsAppLink}>
                <WhatsApp className="h-6 w-6 m-0 inline-block fill-white dark:fill-black" />
              </ButtonLink>
            )}
            {/* @ts-ignore */}
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
          <div className="font-medium text-gray-500 dark:text-white flex items-center justify-center">
            {userLocation && showLocation && (
              <span>{Math.ceil(group.distance || 0)} km</span>
            )}
          </div>
        }
      />
    </>
  );
}

function SportsGrid({
  sports,
  lang,
  t
}: {
  sports: Sport[];
  lang: Language;
  t: TFunction;
}) {
  if (!sports) {
    return null;
  }
  const width = 'w-full md:w-56 lg:w-56 xl:w-56';

  return (
    <div className="w-full m-auto grid grid-flow-row gap-2 md:w-full md:grid-flow-col md:grid-rows-2">
      {sports
        .sort((a, b) => a.id - b.id)
        .map((s) => (
          <Link to={`?actionId=${actions.search}&sport=${s.id}`} key={s.id}>
            <DisplayImg
              imageId={`product/sports/${s.picture}`}
              key={s.id}
              alt={getLocalizedText(lang, s.name)}
              dontMessWithImgSize={true}
              className={width}
              variant="Grid"
            />
          </Link>
        ))}
      {new Array(8 - sports.length).fill(null).map((a, i) => (
        <a
          href={`mailto:feedback@dicisports.com?subject=${t(
            'Add Sport Mail Subject'
          )}`}
          key={i}
        >
          <DisplayImg
            imageId={'product/sports/add-sport_xe6eok'}
            key={i}
            alt={t('Add Sport')}
            className={width}
            dontMessWithImgSize={true}
            variant="Grid"
          />
        </a>
      ))}
    </div>
  );
}

/**
 * Not using @reach/dialog in order to inline form controls and keep
 * all state in a single form
 *
 * @param props
 * @constructor
 */
function FiltersDialog(props: {
  isOpen: boolean;
  sports: Sport[];
  groupsSpirit: GroupSpirit[];
  triggerModalClose: () => void;
  filters: FilterParams | null;
}) {
  const { t, i18n } = useTranslation('home');
  const { isOpen, sports, groupsSpirit, triggerModalClose, filters } = props;
  const sportsOptions: Option[] = [];

  sports.map((s) => {
    sportsOptions.push({
      value: s.id,
      label: s.name
    });
    return s;
  });
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
          'w-5/6 max-w-lg',
          'bg-white dark:bg-gray-900 border-2 border-black dark:border-white rounded-lg font-extrabold',
          {
            'hidden ': !isOpen,
            'm-auto': isOpen
          }
        )}
      >
        <div className="relative">
          <button
            type="button"
            className="absolute top-2 right-2"
            onClick={triggerModalClose}
          >
            <XCircleIcon className="w-8" />
          </button>
          <div className="px-6 py-2 flex flex-col items-center lg:px-24 lg:py-14">
            <H3 className="w-full md:w-112 text-left">{t('Filters')}</H3>
            <Spacer size="2xs" />

            <FormField
              label={t('Sport')}
              id="sport"
              className="w-full md:w-112"
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
              className="w-full md:w-112"
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
              className="w-full md:w-112"
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
              className="w-full md:w-112"
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
            <div className="w-full md:w-112 flex flex-wrap gap-4 justify-end">
              <Button
                variant="secondary"
                type="button"
                onClick={triggerModalClose}
              >
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
      </div>
    </div>
  );
}

function DisplayFilters(props: {
  filters: FilterParams;
  sports: Sport[];
  spirits: GroupSpirit[];
  t: TFunction;
  tc: TFunction;
}) {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const { filters, sports, spirits, t, tc } = props;

  if (!filters) {
    return null;
  }
  const { spirit, sport, dayOfWeek, dayParts } = filters;
  const label: string[] = [];

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
    );
  }
  // if all day parts are picked, just ignore to save space
  if (dayParts && dayParts.length > 0 && dayParts.length !== 3) {
    const parts = semanticOr(
      dayParts.map((v) => t(v)),
      t('Or')
    );

    if (label.length === 1) {
      label[0] = `${label[0]}, ${parts}`;
    } else {
      label.push(parts);
    }
  }

  if (spirit && spirit.length > 0 && spirit.length !== 5) {
    label.push(
      t('Filter Spirit', {
        sport: semanticOr(
          spirit.map((s) => mapIdToName(s, spirits, language as Language)),
          t('Or')
        )
      })
    );
  }

  // using h1 for sports based on SEO recommendations from ahrefs
  return (
    <div className="flex mx-2 items-center dark:text-white text-blueGray-500 text-sm">
      {sport && (
        <h1 className="font-bold">
          {mapIdToName(sport, sports, language as Language)}{' '}
        </h1>
      )}
      {sport && label.length > 0 && <>&nbsp;|&nbsp;</>}
      {label.join(' | ')}
    </div>
  );
}

/**
 * Create a human-readable phrase from a list of strings
 * @param list
 * @param or
 */
function semanticOr(list: string[], or: string) {
  if (list.length === 1) {
    return list[0];
  }
  return `${list.slice(0, -1).join(', ')} ${or} ${list.slice(-1)}`;
}

function mapIdToName(
  id: number,
  universe: Sport[] | GroupSpirit[],
  lang: Language
): string {
  const entity = universe.find((u) => u.id === id);

  return getLocalizedText(lang, entity?.name);
}
