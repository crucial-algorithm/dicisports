import type { LoaderFunction, MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import type { FetcherWithComponents } from '@remix-run/react';
import { Form, Link, useFetcher, useLoaderData } from '@remix-run/react';
import type { TFunction } from 'i18next';

import type { Document, Event, Organizer, Perk, Race } from '@prisma/client';
import { Status } from '@prisma/client';
import {
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  GlobeAltIcon,
  HeartIcon,
  MapPinIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HeartIcon as Favorite,
  XMarkIcon
} from '@heroicons/react/24/solid';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { InView } from 'react-intersection-observer';
import { Tooltip } from 'primereact/tooltip';

import CopyToClipboard from '~/components/shared/CopyToClipboard';

import useLang from '~/hooks/useLang';
import type { EventWithRacesDifficultiesAndDocuments } from '~/server/db/events.server';
import {
  findEventBySlug,
  findUserFavoriteEvent
} from '~/server/db/events.server';
import Main from '~/components/shared/Main';
import { H2, H3, H4, H5, H6, Paragraph } from '~/components/shared/typography';
import Button, { ButtonLink } from '~/components/shared/Button';
import { getUser } from '~/server/auth/session.server';
import { Notification } from '~/components/shared/NotificationMessage';
import DisplayImg from '~/components/shared/DisplayImg';
import type { Language, TranslationObject, User } from '~/types';
import { findEventRaces } from '~/server/db/races.server';
import DisplayDate from '~/components/shared/DIsplayDate';
import { displayTimeOfDay, fetcherType } from '~/utils/misc';
import { findEventPerks } from '~/server/db/perks.server';
import WhenListEmpty from '~/components/shared/Empty';
import { getI18nText } from '~/components/I18nText';
import { findOrganizer } from '~/server/db/organizer.server';

import EventGalleria from '~/components/EventGalleria';

type LoaderData = {
  event: EventWithRacesDifficultiesAndDocuments;
  isUserFavorite: boolean;
  races: Race[];
  perks: Perk[];
  organizer?: Organizer;
};

const actions = {
  add: 'add',
  remove: 'remove'
};

export const handle: { id: string; i18n: string[] } = {
  id: 'event',
  i18n: ['event']
};

export const meta: MetaFunction<LoaderData> = ({ data }) => {
  const loaderData = data as LoaderData;

  return [{ title: loaderData.event ? loaderData.event.name : 'DiciSports - This Is Sports' }];
};

export async function loadDisplayEventData(
  user: User | null,
  event: Event | null
) {
  let organizer: Organizer | null = null;
  let isUserFavorite = false;

  if (user && event) {
    isUserFavorite = !!(await findUserFavoriteEvent(user.id, event.id));
  }

  if (event) {
    organizer = await findOrganizer(event.createdById);
  }

  const eventId = event?.id as string;
  const races = await findEventRaces(eventId);

  return json({
    event: event,
    isUserFavorite,
    races,
    perks: await findEventPerks(eventId),
    organizer: organizer && organizer.status !== 'PENDING' ? organizer : null
  });
}

export const loader: LoaderFunction = async ({ params, request }) => {
  // params.lang holds the value of the language user is accessing
  const user = await getUser(request);
  const slug = params.slug as string;

  if (!slug) {
    redirect('/');
  }

  const event = await findEventBySlug(slug);

  return loadDisplayEventData(
    user,
    event?.status === Status.published ? event : null
  );
};

export default function EventDisplayRoute() {
  const favorite = useFetcher();
  const { event, isUserFavorite, races, perks, organizer } =
    useLoaderData<LoaderData>() as unknown as LoaderData;
  const { i18n, t } = useTranslation('event');

  let minPrice = 0;
  const [isEventHeaderVisible, setEventHeaderVisible] = useState<boolean>(true);
  const [areRacesVisible, setAreRacesVisible] = useState<boolean>(false);
  const [minHeight, setMinHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!races) {
      return;
    }

    const raceHeights = races.map((r: Race) => {
      return document.getElementById(`race-${r.id}`)?.clientHeight || 0;
    });

    if (!minHeight) {
      setMinHeight(Math.max(...raceHeights));
    }
  }, [minHeight, races]);

  if (!event) {
    return (
      <Main>
        <Paragraph data-cy="event-not-found">{t('Event not found')}</Paragraph>
        <Link to="/">{t('Event not found action')}</Link>
      </Main>
    );
  }

  function determineRacePrice(r: Race): number {
    if (
      r.priceEarlyBird &&
      r.validUntil &&
      new Date(r.validUntil) > new Date()
    ) {
      return r.priceEarlyBird;
    }
    return r.price;
  }

  if (races) {
    const prices = races.map((r: Race) => determineRacePrice(r));

    prices.sort((a: number, b: number) => a - b);
    minPrice = prices[0];
  }

  const isBookingClosed =
    new Date(
      event.bookingStopsAt ? event.bookingStopsAt : (event.startAt as Date)
    ) < new Date();

  return (
    <>
      <StickyPriceTag
        eventName={event.name as string}
        minPrice={minPrice}
        t={t}
        visible={!isEventHeaderVisible}
        hidePrice={areRacesVisible}
      />

      <Main>
        <InView as="div" onChange={setEventHeaderVisible} threshold={0.2}>
          <EventHeader
            event={event}
            favorite={favorite}
            minPrice={minPrice}
            t={t}
            isUserFavorite={isUserFavorite}
            language={i18n.language}
          />
        </InView>
        <div className="my-8">
          <H3>{t('About')}</H3>
          <div
            className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2 whitespace-pre-line prose"
            data-cy="description"
            dangerouslySetInnerHTML={{ __html: event.description || '...' }}
          />
        </div>

        <H3 id="races-list">{t('Races')}</H3>
        <InView as="div" onChange={setAreRacesVisible} threshold={0.2}>
          <div
            data-cy="races-list"
            className="flex flex-col mt-2 scroll-mx-2 items-center md:items-start md:flex-row md:flex-nowrap md:overflow-x-auto pb-10 hide-scrollbar"
          >
            {races
              .sort((a: Race, b: Race) => a.displayOrder - b.displayOrder)
              .map((race: Race, index: number) => (
                <DisplayRace
                  race={race}
                  key={race.id}
                  index={index}
                  eventId={event.id}
                  isBookingClosed={isBookingClosed}
                  minHeight={minHeight}
                  externalBookingUrl={event.externalBookingUrl}
                />
              ))}
            <WhenListEmpty list={races}>
              <H6
                className="text-center p-12"
                variant="secondary"
                as="p"
                data-cy="no-races"
              >
                {t('No Races')}
              </H6>
            </WhenListEmpty>
          </div>
        </InView>

        <div className="my-8">
          <H3>{t('Perks')}</H3>
          <div className="grid grid-rows-8 md:grid-rows-6 md:grid-flow-col gap-y-4 md:gap-y-2 my-2">
            {perks
              .sort((a: Perk, b: Perk) => a.displayOrder - b.displayOrder)
              .map((p: Perk, index: number) => (
                <div key={p.id} className="flex items-center" data-cy="perk">
                  {p.isEnabled && (
                    <CheckIcon
                      className="w-5 h-5 dark:text-blueGray-500"
                      data-cy={`perk-${p.id}-available`}
                    />
                  )}
                  {!p.isEnabled && (
                    <XMarkIcon
                      className="w-5 h-5 dark:text-blueGray-500"
                      data-cy={`perk-${p.id}-unavailable`}
                    />
                  )}
                  <p
                    className="ml-1 text-sm font-medium text-gray-900 dark:text-gray-300"
                    data-cy={`perk-${index}`}
                  >
                    {p.name}
                  </p>
                </div>
              ))}
          </div>
        </div>

        {event.directions && (
          <div className="my-8">
            <H3>{t('How to get there')}</H3>
            <div
              data-cy="directions"
              className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2 whitespace-pre-line prose"
              dangerouslySetInnerHTML={{ __html: event.directions || '...' }}
            />
          </div>
        )}

        <H3>{t('Documents')}</H3>
        <div
          data-cy="documents-list"
          className="flex flex-row flex-wrap mb-8 mt-2"
        >
          <DisplayRegulation event={event} />
          {event.documents
            .sort((a: Document, b: Document) => a.position - b.position)
            .map((document: Document, index: number) => (
              <DisplayDocument
                document={document}
                key={document.id}
                index={index}
              />
            ))}
        </div>
        {organizer && <OrganizerFooter organizer={organizer} />}
      </Main>
    </>
  );
}

type DisplayRaceProps = {
  race: Race;
  index: number;
  eventId: string;
  isBookingClosed: boolean;
  minHeight: number | null;
  externalBookingUrl?: string | null;
};

function calculatePriceStructure(race: Race) {

  if (race.priceEarlyBird && race.validUntil) {
    const daysUntilEnd = Math.floor(
      (new Date(race.validUntil).getTime() - Date.now() + 86400 * 1000) /
        (1000 * 60 * 60 * 24)
    );

    if (daysUntilEnd > 0) {
      return {
        price: race.price,
        discountPrice: race.priceEarlyBird,
        daysUntilEnd,
        discountDateEnd: race.validUntil,
        earlyBird: true
      };
    }
  }

  if (race.priceLateBird && race.applyAfter) {
    const daysUntilEnd = Math.floor(
      (new Date(race.applyAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilEnd > 0) {
      return {
        price: race.priceLateBird,
        discountPrice: race.price,
        daysUntilEnd: daysUntilEnd,
        discountDateEnd: race.applyAfter,
        earlyBird: false
      };
    }

    return {
      price: race.priceLateBird,
      discountPrice: null,
      daysUntilEnd: null,
      discountDateEnd: null,
      earlyBird: false
    };
  }

  return {
    price: race.price,
    discountPrice: null,
    daysUntilEnd: null,
    discountDateEnd: null,
    earlyBird: false
  };
}

type DisplayPriceProps = {
  race: Race;
  t: TFunction;
};

function DisplayPrice({ race, t }: DisplayPriceProps) {
  const { discountPrice, price, daysUntilEnd, discountDateEnd, earlyBird } =
    calculatePriceStructure(race);
  const inDiscount = discountPrice && daysUntilEnd;
  const translations = {
    early: {
      prefixDate: 'Early Bird Valid Until',
      prefixDays: 'Early Bird Valid During'
    },
    late: {
      prefixDate: 'Late Bird Valid Until',
      prefixDays: 'Late Bird Valid During'
    }
  }[earlyBird ? 'early' : 'late'];


  return (
    <>
      {inDiscount ? (
        <>
          <div className="flex flex-row gap-x-5 items-end px-28">
            <H5
              className="dark:text-blueGray-500 line-through"
              data-cy={`race-future-price-${race.id}`}
            >
              {price / 1000}€
            </H5>
            <H3 data-cy={`race-price-${race.id}`}>{discountPrice / 1000}€</H3>
          </div>

          <div className="border-b h-2 w-48 mb-2" />

          <div>
            {/*if early bird price deadline is bigger than 30 days, we'll show the date instead of days*/}
            <p className="text-sm font-medium dark:text-white">
              {daysUntilEnd < 30 ? t(translations.prefixDays) : t(translations.prefixDate)}
            </p>
            <p
              className="text-sm font-medium dark:text-blueGray-500"
              data-cy={`race-valid-until-${race.id}`}
            >
              {daysUntilEnd < 30 ? (
                t(daysUntilEnd === 1 ? 'Valid Day' : 'Valid Days', {
                  total: daysUntilEnd
                })
              ) : (
                <DisplayDate date={new Date(String(discountDateEnd))} />
              )}
            </p>
          </div>
        </>
      ) : (
        <H3 className="items-center" data-cy={`race-price-${race.id}`}>
          {price / 1000}€
        </H3>
      )}
    </>
  );
}

function DisplayRace({
  race,
  index,
  eventId,
  isBookingClosed,
  minHeight,
  externalBookingUrl
}: DisplayRaceProps) {
  const { t } = useTranslation('event');
  const raceTime = displayTimeOfDay(race.startTime);
  const [expanded, setExpanded] = useState<boolean>(false);

  function handleSeeMore() {
    expanded ? setExpanded(false) : setExpanded(true);
  }

  return (
    <div
      className="flex flex-col w-[340px] gap-y-4 justify-between mb-4 mr-2 md:mr-4 text-center items-center border border-black dark:border-white rounded-2xl outline-offset-1 md:overflow-hidden"
      data-cy={`race-${index}`}
      id={`race-${race.id}`}
      // Using style, since 'min-h-[value]' was being purged 🤷
      style={{ minHeight: minHeight ? minHeight : 410 }}
    >
      <div className="flex flex-col gap-y-4">
        <div className="mt-4" data-cy="race">
          <H4 data-cy={`race-name-${race.id}`}>{race.name}</H4>
        </div>
        <div>
          <H4>{t('Race Distance')}</H4>
          <H5
            className="dark:text-blueGray-500"
            data-cy={`race-distance-${race.id}`}
          >
            {race.distance}km
          </H5>
        </div>
        <div>
          <H4>{t('Race Start Time')}</H4>
          <H5
            className="dark:text-blueGray-500"
            data-cy={`race-time-${race.id}`}
          >
            {raceTime}
          </H5>
        </div>
        <div className={clsx('flex flex-col items-center justify-center')}>
          <DisplayPrice race={race} t={t} />
        </div>
        {expanded && (
          <>
            {race.raceDescription && (
              <div>
                <H4>{t('Description')}</H4>
                <div
                  className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2 whitespace-pre-line px-4"
                  data-cy={`race-description-${race.id}`}
                  dangerouslySetInnerHTML={{ __html: race.raceDescription }}
                />
              </div>
            )}
            <div>
              <H4>{t('Elevation Gain')}</H4>
              <div
                className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2"
                data-cy={`elevation-gain-${race.id}`}
              >
                {race.elevationGain}m
              </div>
            </div>
            {race.elevationLoss && (
              <div>
                <H4>{t('Elevation Loss')}</H4>
                <div
                  className="dark:text-blueGray-500 text-base font-medium mr-2 mt-2"
                  data-cy={`elevation-loss-${race.id}`}
                >
                  {race.elevationLoss}m
                </div>
              </div>
            )}
            {race.track && (
              <Link
                to={`/event/${eventId}/race/${race.id}/gpx`}
                target="_blank"
                rel="noreferrer"
                data-cy={`gpx-${race.id}`}
                download
              >
                <H4 className="my-4 underline dark:text-blueGray-500">{t('GPX')}</H4>
              </Link>
            )}
          </>
        )}
      </div>
      <div className="mb-4">
        <SeeMoreOrLessButton
          name={`see-more-${race.id}`}
          onClick={handleSeeMore}
          expanded={expanded}
          t={t}
        />

        {!externalBookingUrl && (
          <Form
            method="get"
            action="/checkout/create"
            className="flex flex-col gap-y-1 mt-2"
          >
            <input type="hidden" value={race.id} name="raceId" />
            <input type="hidden" value={race.eventId} name="eventId" />
            <Button disabled={isBookingClosed} name={`race-${race.id}`}>
              {t('Book')}
            </Button>
            {isBookingClosed && (
              <label
                className="dark:text-blueGray-500"
                data-cy="booking-closed"
              >
                {t('Booking Closed')}
              </label>
            )}
          </Form>
        )}

        {externalBookingUrl && (
          <ButtonLink id={`book-race-${race.id}`} to={externalBookingUrl}>
            {t('Book')}
          </ButtonLink>
        )}
      </div>
    </div>
  );
}

function DisplayDocument(props: { document: Document; index: number }) {
  const lang = useLang();
  const { document, index } = props;

  return (
    <Link
      to={`/${lang}/event/${document.eventId}/doc/${document.id}/view`}
      target="_blank"
      rel="noreferrer"
      className="text-black dark:text-white"
      data-cy="document-label"
    >
      <div
        className="flex items-center border border-black dark:border-white rounded-2xl h-16 p-4 mr-2 mb-2"
        data-cy={`document-${index}`}
      >
        <div
          className="dark:text-white font-medium border-2 border-secondary bg-primary rounded-full p-2 mr-2"
          data-cy="document-extension"
        >
          {document.type?.toUpperCase()}
        </div>
        {document.label}
      </div>
    </Link>
  );
}

function DisplayRegulation({ event }: { event: Event }) {
  const { t } = useTranslation('event');
  const lang = useLang();

  if (!event.regulationContent && !event.regulationPath) {
    return null;
  }
  const isInlineRegulation = !!event.regulationContent;
  const path = isInlineRegulation
    ? `/${lang}/event/${event.slug}/regulation`
    : `/${lang}/event/${event.id}/regulation/view`;

  return (
    <Link
      to={path}
      target="_blank"
      rel="noreferrer"
      className="text-black dark:text-white"
      data-cy="regulation"
    >
      <div className="flex items-center border border-black dark:border-white rounded-2xl h-16 p-4 mr-2 mb-2">
        {t('Regulation')}
      </div>
    </Link>
  );
}

function EventHeader({
  event,
  favorite,
  minPrice,
  t,
  language,
  isUserFavorite
}: {
  event: EventWithRacesDifficultiesAndDocuments;
  favorite: FetcherWithComponents<any>;
  minPrice: number;
  t: TFunction;
  language: string;
  isUserFavorite: boolean;
}) {
  const favoriteAddedMessage = t('Favorite Added');
  const favoriteRemovedMessage = t('Favorite Removed');
  const copiedToClipMessage = t('Copied to Clipboard');

  const [isFavorite, setIsFavorite] = useState<boolean>(isUserFavorite);
  const [message, setMessage] = useState<string>(favoriteAddedMessage);
  const [address, setAddress] = useState<string>('');
  const galleria = useRef(null);
  let showFavoriteAddedNotification: any = null;
  let showCopiedToClipboardNotification: any = null;

  const images: string[] = [
    event.image1,
    event.image2,
    event.image3,
    event.image4,
    event.image5
  ].filter(Boolean) as string[];

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
    const typeOfFetcher = fetcherType(favorite);

    if (typeOfFetcher === 'actionReload' && favorite.data.ok) {
      setMessage(
        favorite.data.action === actions.add
          ? favoriteAddedMessage
          : favoriteRemovedMessage
      );
      setIsFavorite(favorite.data.action === actions.add);
      showFavoriteAddedNotification();
    }

    const url = new URL(window.location.href);

    setAddress(url.origin);
  }, [
    favorite,
    showFavoriteAddedNotification,
    favoriteAddedMessage,
    favoriteRemovedMessage
  ]);

  function handleOpenGallery(e: React.MouseEvent) {
    // @ts-ignore
    galleria.current?.show();

    e.stopPropagation();
  }

  // @ts-ignore
  const location: undefined | { place: string } = event.location;

  return (
    <div className="flex flex-col md:flex-row mt-4">
      <div
        className="relative w-full md:w-[22rem] cursor-pointer"
        onClick={handleOpenGallery}
      >
        <DisplayImg
          dataCy="image0"
          imageId={images[0]}
          dontMessWithImgSize={true}
          className="w-[500px] object-cover object-center"
          transformations={{
            resize: {
              type: 'fill',
              width: 400,
              height: 400
            }
          }}
        />
        <div className="absolute rounded bottom-0 left-0 right-0 m-auto px-2 w-fit bg-gray-500/70 text-white">
          {t('Click for full size image')}
        </div>
      </div>

      <EventGalleria values={images} ref={galleria} />

      <div className="flex flex-auto flex-col mt-4 ml-4">
        <div className="flex flex-row justify-end mb-2">
          <H2 className="text-sp-light-blue-900 mb-8 w-[calc(100%-(40px+40px+8px))]">
            <b data-cy="name" className="break-words w-full">
              {event.name}
            </b>
          </H2>
          <favorite.Form method="post" action={`/fav/${event.id}`}>
            {isFavorite ? (
              <Button
                size="tiny"
                name="action"
                value={actions.remove}
                className="w-[40px] h-[40px]"
              >
                <Favorite className="h-6 w-6 m-0 inline-block" />
              </Button>
            ) : (
              <Button
                size="tiny"
                name="action"
                value={actions.add}
                className="w-[40px] h-[40px]"
              >
                <HeartIcon className="h-6 w-6 m-0 inline-block" />
              </Button>
            )}
          </favorite.Form>
          <CopyToClipboard
            text={`${address}/event/${event.slug}`}
            id={event.id}
            successMessage={handlerClickToCopy}
            className="w-[40px] h-[40px] ml-2"
          />
          <Notification show={handlerSetShowNotificationFunction}>
            {message}
          </Notification>
          <Notification show={handlerSetShowNotificationCopyToClipboard}>
            {copiedToClipMessage}
          </Notification>
        </div>
        <div className="flex flex-row items-center mb-2">
          <CalendarDaysIcon className="h-6 w-6 m-0 inline-block text-primary" />
          <H6 data-cy="date" className="ml-4 md:ml-2">
            <DisplayDate date={new Date(event.startAt || 0)} />
          </H6>
        </div>
        <div className="flex flex-row items-center mb-2">
          <MapPinIcon className="h-6 w-6 m-0 inline-block text-primary" />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${event.lat}%2C${event.lng}`}
            target="_blank"
            rel="noreferrer"
            data-cy="location-link"
          >
            <H6 className="ml-4 mr-2 md:ml-2">
              <span data-cy="location">{event.placeName}</span>
              {location && location.place && <>,&nbsp;{location.place}</>}
              <span className="text-sm link">&nbsp;{t('Open map')}</span>
            </H6>
          </a>
        </div>
        <div className="flex flex-row items-center mb-2">
          <ArrowTrendingUpIcon className="h-6 w-6 m-0 inline-block text-primary" />
          <DisplayDifficulty
            name={getI18nText(
              event.difficulty?.name as TranslationObject,
              language as Language
            )}
            description={getI18nText(
              event.difficulty?.description as TranslationObject,
              language as Language
            )}
          />
        </div>
        {event.externalWebsite && (
          <div className="flex flex-row items-center mb-2">
            <GlobeAltIcon className="h-6 w-6 m-0 inline-block text-primary" />
            <H6 className="ml-4 md:ml-2">
              <a href={event.externalWebsite} target="_blank" rel="noreferrer">
                {t('External website')}
              </a>
            </H6>
          </div>
        )}
        <div className="flex flex-row justify-between items-center mt-16 dark:bg-gray-900 bg-white">
          <div className="flex flex-col justify-start">
            <H6 className="md:ml-2">{t('From')}</H6>
            <H2
              data-cy="price"
              className="text-sp-light-blue-900 w-full md:ml-2"
            >
              <b className="break-words">{`${
                minPrice ? minPrice / 1000 : t('Undefined')
              }€`}</b>
            </H2>
          </div>
          <ButtonLink to="#races-list">{t('Races Anchor')}</ButtonLink>
        </div>
      </div>
    </div>
  );
}

function StickyPriceTag({
  eventName,
  minPrice,
  t,
  visible,
  hidePrice
}: {
  eventName: string;
  minPrice: number;
  t: TFunction;
  visible: boolean;
  hidePrice: boolean;
}) {
  return (
    <div
      className={clsx(
        'flex flex-row justify-between items-center inset-x-0 top-0 p-4 fixed dark:bg-gray-900 bg-white dark:border-gray-500 drop-shadow-md z-10',
        {
          flex: visible,
          hidden: !visible
        }
      )}
    >
      <H3 className="text-sp-light-blue-900 w-full md:ml-2">
        <b className="break-words">{eventName}</b>
      </H3>
      {!hidePrice && (
        <div className="flex flex-col md:flex-row items-center">
          <div className="flex flex-col md:justify-start">
            <H6 className="md:ml-2">{t('From')}</H6>
            <H2
              data-cy="sticky-price"
              className="text-sp-light-blue-900 w-full md:ml-2"
            >
              <b className="break-words">{`${minPrice / 1000}€`}</b>
            </H2>
          </div>
          <ButtonLink className="md:ml-16" to="#races-list">
            {t('Races Anchor')}
          </ButtonLink>
        </div>
      )}
    </div>
  );
}

function OrganizerFooter({ organizer }: { organizer: Organizer }) {
  return (
    <footer data-cy="organizer-profile">
      <div className="container px-4 mx-auto">
        <div className="-mx-4 flex flex-wrap">
          <div className="px-4 my-4 w-full">
            <div className="flex flex-row gap-x-2 items-center">
              <div className="w-14 h-14">
                <DisplayImg
                  transformations={{
                    resize: {
                      type: 'fill',
                      width: 56,
                      height: 56
                    }
                  }}
                  imageId={organizer.logo}
                />
              </div>
              <H4 data-cy="organizer-name">{organizer.name}</H4>
            </div>

            <div className="mt-4 whitespace-pre-wrap max-w-[90ch] dark:text-blueGray-500 text-gray-500 text-base break-words">
              {organizer.description}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function DisplayDifficulty({
  name,
  description
}: {
  name: string;
  description: string;
}) {
  return (
    <div className="w-full lg:w-min">
      {/*Can't use breakpoints, so hiding/showing the correct one according to size */}
      <Tooltip target=".difficulty-tooltip" className="hidden lg:flex w-112" />
      <Tooltip
        target=".difficulty-tooltip-bottom"
        className="flex lg:hidden mx-2"
      />
      {/*Right tooltip*/}
      <H6
        data-cy="difficulty"
        className="hidden lg:flex flex-row items-center gap-x-2 ml-4 lg:ml-2 difficulty-tooltip"
        data-pr-tooltip={description}
        data-pr-position="right+5"
      >
        {name}
        <QuestionMarkCircleIcon className="h-4 w-4 m-0 inline-block text-primary" />
      </H6>

      {/*Bottom tooltip*/}
      <H6
        data-cy="difficulty"
        className="flex lg:hidden flex-row items-center gap-x-2 ml-4 lg:ml-2 difficulty-tooltip-bottom"
        data-pr-tooltip={description}
        data-pr-position="bottom"
      >
        {name}
        <QuestionMarkCircleIcon className="h-4 w-4 m-0 inline-block text-primary" />
      </H6>
    </div>
  );
}

function SeeMoreOrLessButton({
  name,
  onClick,
  expanded,
  t,
  className
}: {
  name: string;
  onClick: () => void;
  expanded: boolean;
  t: TFunction;
  className?: string;
}) {
  const iconClassName =
    'absolute inline-block h-4 w-4 m-0 text-white bg-black dark:bg-blueGray-500 rounded-full cursor-pointer';

  return (
    <div
      className="flex flex-col items-center relative py-2 mb-4"
      onClick={onClick}
    >
      <label
        data-cy={name}
        className={clsx(
          'dark:text-white text-sm font-medium border-black dark:border-blueGray-500 py-1 px-2 cursor-pointer',
          className,
          {
            'border-t-2': expanded,
            'border-b-2': !expanded
          }
        )}
      >
        {expanded ? t('See Less') : t('See More')}
      </label>
      {expanded ? (
        <ChevronUpIcon className={clsx('top-0', iconClassName)} />
      ) : (
        <ChevronDownIcon className={clsx('bottom-0', iconClassName)} />
      )}
    </div>
  );
}
