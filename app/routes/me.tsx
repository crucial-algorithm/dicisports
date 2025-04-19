import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import React, { useRef, useState } from 'react';

import type { TFunction } from 'i18next';
import clsx from 'clsx';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigate
} from '@remix-run/react';

import {
  ArrowRightOnRectangleIcon,
  HeartIcon as FavoriteIcon
} from '@heroicons/react/24/solid';

import { useTranslation } from 'react-i18next';

import DisplayDate from '~/components/shared/DIsplayDate';

import ProfileFragment from '~/components/ProfileFragment';
import SearchField from '~/components/shared/SearchField';
import { useRootData } from '~/hooks';

import i18n from '~/server/i18n.server';

import Button from '~/components/shared/Button';

import InputError from '~/components/shared/form/InputError';
import { H2, H4, H6 } from '~/components/shared/typography';
import { getSession, requireUser } from '~/server/auth/session.server';
import { handleFormSubmission } from '~/server/actions.server';
import { updateUser } from '~/server/db/users.server';

import Main from '~/components/shared/Main';
import { Spacer } from '~/components/shared/Spacer';
import type { Sport, BookingList } from '~/types';

import DisplayImg from '~/components/shared/DisplayImg';
import { findSports } from '~/server/db/reference.server';
import WhenListEmpty from '~/components/shared/Empty';

import { generateSlug } from '~/utils/misc';
import {
  findUserFavoriteEvents,
  removeEventFromFavorites
} from '~/server/db/events.server';

import { findUserBookingsList } from '~/server/db/booking.server';

const actionIds = {
  logout: 'logout',
  changeDetails: 'change details',
  remove: 'remove'
};

type ActionData = {
  status: 'success' | 'error';
  fields: {
    name?: string | null;
  };
  errors: {
    generalError?: string | null;
    name?: string | null;
  };
};

type LoaderData = {
  sports: Sport[];
  favorites: Favorite[] | [];
  bookings: BookingList[] | [];
  totalBookings: number;
  searchedName: string;
  pageNumber: number;
};

export const handle = {
  i18n: ['me']
};

type Favorite = {
  type: string;
  id: string;
  name: string;
  slug: string;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  image5: string | null;
  sportId: number;
  eventDate?: Date;
};

const actionsId = {
  nextPage: 'nextPage',
  previousPage: 'previousPage'
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);
  const favorites: Favorite[] = [];

  const sports = await findSports();
  const favoriteEvents = await findUserFavoriteEvents(user.id as string);

  const { searchParams } = new URL(request.url);
  let page = searchParams.get('page')?.length
    ? Number(searchParams.get('page'))
    : 0;

  favoriteEvents?.map((f) =>
    favorites.push({
      type: 'e',
      id: f.id,
      name: f.name as string,
      slug: f.slug as string,
      image1: f.image1,
      image2: f.image2,
      image3: f.image3,
      image4: f.image4,
      image5: f.image5,
      sportId: f.sportId as number,
      eventDate: f.startAt as Date
    })
  );

  const searchedName = searchParams.get('searched-name');

  // In order to make pagination work on Cypress, we are now doing it server side
  const actionId = searchParams.get('actionId');
  const setPage = searchParams.get('set-page');

  // If user presses next/previous page button
  if (actionId) {
    if (actionId === actionsId.nextPage) {
      page += 1;
    }

    if (actionId === actionsId.previousPage) {
      page -= 1;
    }
  }

  // If user presses specific page button
  if (setPage?.length) {
    page = Number(setPage);
  }

  const { results, total } = await findUserBookingsList(
    user.id,
    page,
    searchedName?.length ? searchedName : null
  );

  return json({
    sports,
    favorites,
    bookings: results,
    totalBookings: total,
    searchedName,
    pageNumber: page
  });
};

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'profile');
  const user = await requireUser(request);
  const form = new URLSearchParams(await request.text());
  const actionId = form.get('actionId');

  if (actionId === actionIds.logout) {
    const session = await getSession(request);

    session.signOut();
    const searchParams = new URLSearchParams({
      message: await t('See you again soon')
    });

    return redirect(`/?${searchParams.toString()}`, {
      headers: await session.getHeaders()
    });
  }

  if (actionId === actionIds.remove) {
    const favoriteTypeAndId = form.get('f-type-id') as string;
    const favoriteId = favoriteTypeAndId.split('|')[1];

    try {
      await removeEventFromFavorites(user.id, favoriteId);

      return json({});
    } catch (e) {
      console.log('error: ', e);
      // TODO: return error
    }
  }

  function getFirstNameError(firstName: string | null) {
    if (!firstName?.length) {
      return t('Required Name');
    }
    return null;
  }

  return await handleFormSubmission<ActionData>({
    form,
    validators: { name: getFirstNameError },
    handleFormValues: async ({ name }) => {
      if (name && user.name !== name) {
        await updateUser(user.id, name);
      }
      const searchParams = new URLSearchParams({
        message: await t('Profile Saved Successfully')
      });

      return redirect(`/me?${searchParams.toString()}`);
    }
  });
};

export default function Me() {
  const { user } = useRootData();
  const {
    sports,
    favorites,
    bookings,
    totalBookings,
    searchedName,
    pageNumber
  } = useLoaderData<LoaderData>() as unknown as LoaderData;
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation('me');

  const numberOfPages = Math.ceil(totalBookings / 10);

  return (
    <Main>
      <H2 id="booking">{t('Your Bookings')}</H2>
      <BookingsList
        bookings={bookings}
        t={t}
        searchedName={searchedName}
        pageNumber={pageNumber}
        numberOfPages={numberOfPages}
      />

      <Spacer size="xs" className="border-b mb-8" />

      <H2>{t('Your Favorites')}</H2>
      <div className="flex flex-col w-[calc(100%-(50px))] p-4">
        {favorites?.map((f) => (
          <div className="w-full border-b p-4 last:border-none" key={f.id}>
            <a
              href={`/event/${f.slug}`}
              className="cursor-pointer"
              data-cy="favorite-entry"
            >
              <DisplayFavorites favorite={f} sports={sports} t={t} />
            </a>
          </div>
        ))}
      </div>

      <WhenListEmpty list={favorites}>
        <H6
          className="text-center p-12"
          variant="secondary"
          as="p"
          data-cy="no-favorites"
        >
          {t('No Favorites')}
        </H6>
      </WhenListEmpty>

      <Spacer size="xs" className="border-b mb-8" />

      <H2>{t("Here's your profile")}</H2>
      <H4 variant="secondary" as="p">
        {t('Edit as you wish')}
      </H4>
      <InputError id="general-error">
        {actionData?.errors.generalError}
      </InputError>

      <div className="col-span-full mt-8 lg:col-span-5 lg:mb-0">
        <Form method="post" className="w-full md:w-96">
          <ProfileFragment
            labelName={t('Name')}
            labelEmail={t('Email')}
            profile={{ name: user?.name, email: user?.email || '' }}
            error={actionData?.errors.name}
          />
          <Button className="mt-8" type="submit" form="profile-form">
            {t('Update Profile')}
          </Button>
        </Form>
      </div>
      <Spacer size="xs" className="border-b mb-8" />
      <Form method="post">
        <input type="hidden" name="actionId" value={actionIds.logout} />
        <Button variant="secondary">
          <ArrowRightOnRectangleIcon className="w-4 h-4" />
          <H6 as="span">{t('Logout')}</H6>
        </Button>
      </Form>
    </Main>
  );
}

function DisplayFavorites({
  favorite,
  sports,
  t
}: {
  favorite: Favorite;
  sports: Sport[];
  t: TFunction;
}) {
  const fetcher = useFetcher();

  const entry = {
    id: favorite.id,
    name: favorite?.name || '',
    image1: favorite.image1,
    image2: favorite.image2,
    image3: favorite.image3,
    image4: null,
    image5: null
  };

  return (
    <div className="flex flex-row justify-between">
      <div className="flex flex-row">
        <EntryImage
          entry={entry}
          img={sports.find((s) => s.id === favorite.sportId)?.picture}
        />
        <div className="flex flex-col gap-y-2 ml-4">
          <H4>{favorite.name}</H4>
          <div className="flex flex-col">
            <>
              <H6 className="dark:text-blueGray-500">{t('Event Date')}</H6>
              <H6>
                <DisplayDate date={new Date(favorite.eventDate || 0)} />
              </H6>
            </>
          </div>
        </div>
      </div>
      <fetcher.Form method="post">
        <input
          type="hidden"
          name="f-type-id"
          value={`${favorite.type}|${favorite.id}`}
        />
        <Button
          size="tiny"
          name="actionId"
          value={actionIds.remove}
          className="w-[40px] h-[40px]"
          id={`remove-favorite-${favorite.id}`}
        >
          <FavoriteIcon className="h-6 w-6 m-0 inline-block" />
        </Button>
      </fetcher.Form>
    </div>
  );
}

type PlaceholderImgProps = {
  name: string;
  className: string;
  img?: string;
};

type ListEntry = {
  id: string;
  name: string;
  image1: string | null;
  image2: string | null;
  image3: string | null;
  image4: string | null;
  image5: string | null;
};

function PlaceholderImg({ name, img }: PlaceholderImgProps) {
  if (!img) {
    return null;
  }
  return (
    <DisplayImg
      imageId={`product/sports/${img}`}
      alt={name || ''}
      variant="List"
    />
  );
}

function EntryImage({ entry, img }: { entry: ListEntry; img?: string }) {
  function Wrapper({ children }: {} & React.ComponentProps<'div'>) {
    return <div className="w-[100px] h-[100px]">{children}</div>;
  }

  const { image1, image2, image3, image4, image5 } = entry;
  const images: string[] = [image1, image2, image3, image4, image5].filter(
    Boolean
  ) as string[];

  return (
    <Wrapper>
      {images.length === 0 ? (
        <PlaceholderImg
          name={entry?.name || ''}
          img={img}
          className="w-full rounded-lg bg-gray-100 dark:bg-gray-400 object-cover object-left-top"
        />
      ) : (
        <DisplayImg
          imageId={images[0]}
          transformations={{
            resize: {
              type: 'fill',
              width: 100,
              height: 100
            }
          }}
        />
      )}
    </Wrapper>
  );
}

function BookingsList({
  bookings,
  t,
  searchedName,
  pageNumber,
  numberOfPages
}: {
  bookings: BookingList[];
  t: TFunction;
  searchedName: string;
  pageNumber: number;
  numberOfPages: number;
}) {
  const [searchedParticipantName, setSearchedParticipantName] =
    useState<string>(searchedName);
  const searchForm = useRef<HTMLFormElement>(null);

  function handleSearchedName(value: string) {
    setSearchedParticipantName(value);
    searchForm?.current?.submit();
  }

  return (
    <>
      <Form method="get" preventScrollReset={true} ref={searchForm}>
        <div className="flex justify-end">
          <SearchField
            name="searched-name"
            placeholder={t('Search Placeholder')}
            onChange={handleSearchedName}
            defaultValue={searchedName}
            className="text-sm"
          />
        </div>
      </Form>

      <Form method="get" preventScrollReset={true}>
        <input type="hidden" value={pageNumber} name="page" />

        {searchedName?.length > 0 && (
          <input
            type="hidden"
            value={searchedParticipantName}
            name="searched-name"
          />
        )}

        <div className="flex flex-col">
          <div className="overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="py-2 inline-block min-w-full sm:px-6 lg:px-8">
              <div className="overflow-hidden">
                <table className="table-auto min-w-full">
                  <thead className="border-b">
                    <tr>
                      <TH name={t('Event Name')} />
                      <TH name={t('Booking Date')} />
                      <TH name={t('Status')} />
                      <TH name={t('Number Of Participants')} />
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <BookingListEntry booking={b} t={t} key={b.id} />
                    ))}
                  </tbody>
                </table>
                <WhenListEmpty list={bookings}>
                  <H6 className="text-center p-12" variant="secondary" as="p">
                    {searchedName?.length > 0
                      ? t('No Bookings Found')
                      : t('No Bookings')}
                  </H6>
                </WhenListEmpty>

                <div className="flex justify-end mt-2">
                  <nav aria-label="Page navigation example">
                    <ul className="inline-flex items-center -space-x-px">
                      <li>
                        <button
                          type="submit"
                          className="block px-3 py-2 ml-0 leading-tight text-gray-500 bg-white border border-gray-300 rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                          data-cy="previous-page"
                          name="actionId"
                          value={actionsId.previousPage}
                          disabled={pageNumber === 0}
                        >
                          <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                      </li>

                      {Array(numberOfPages)
                        .fill(0)
                        .map((r, index) => (
                          <li key={index}>
                            <button
                              id={String(index)}
                              className={clsx({
                                'px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white':
                                  index !== pageNumber,
                                'z-10 px-3 py-2 leading-tight text-blue-600 border border-blue-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white':
                                  index === pageNumber
                              })}
                              name="set-page"
                              value={index}
                              data-cy="page-number"
                            >
                              {index + 1}
                            </button>
                          </li>
                        ))}
                      <li>
                        <button
                          type="submit"
                          className="block px-3 py-2 leading-tight text-gray-500 bg-white border border-gray-300 rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                          data-cy="next-page"
                          name="actionId"
                          value={actionsId.nextPage}
                          disabled={pageNumber + 1 === numberOfPages}
                        >
                          <ChevronRightIcon className="h-5 w-5" />
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </>
  );
}

function TH({ name }: { name: string }) {
  return (
    <th className="text-sm font-medium text-black dark:text-white px-6 py-4 text-left">
      {name}
    </th>
  );
}

function TD({ value, dataCy }: { value: string | null; dataCy?: string }) {
  return (
    <td
      className="text-sm text-black dark:text-white font-light px-6 py-4 whitespace-nowrap"
      data-cy={dataCy || '-'}
    >
      {value}
    </td>
  );
}

function BookingListEntry({
  booking,
  t
}: {
  booking: BookingList;
  t: TFunction;
}) {
  const date = String(booking.createdAt).split('T')[0];
  const hour = getHoursAndMinutes(new Date(booking.createdAt));
  const navigate = useNavigate();

  function getHoursAndMinutes(date: Date) {
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
  }

  function handleRedirectToBooking() {
    // If booking process is finished, redirect him to the info route with PIN to check participants information
    const route =
      booking.status === 'checkout' || booking.status === 'confirmed'
        ? 'info'
        : 'payment';

    navigate(
      `/checkout/${route}/${booking.id}${
        booking.status === 'confirmed' ? `?p=${booking.pin}` : ''
      }`
    );
  }

  return (
    <tr
      className="border-b transition duration-300 ease-in-out hover:bg-red cursor-pointer"
      data-cy="participant-row"
      onClick={handleRedirectToBooking}
    >
      <TD
        value={`${booking.event.name}`}
        dataCy={`event-${generateSlug(booking.event.name as string)}`}
      />
      <TD value={`${date} ${hour}`} />
      <TD value={t(booking.status)} dataCy={`status-${booking.id}`} />
      <TD value={`${booking.totalParticipants}`} />
    </tr>
  );
}
