import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import React from 'react';
import type { TFunction } from 'i18next';

import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData
} from '@remix-run/react';

import {
  ArrowRightOnRectangleIcon,
  HeartIcon as FavoriteIcon
} from '@heroicons/react/24/solid';

import { useTranslation } from 'react-i18next';

import ProfileFragment from '~/components/ProfileFragment';
import { useRootData } from '~/hooks';
import {
  findUserFavoriteGroups,
  findUserGroups,
  removeGroupFromFavorites
} from '~/server/db/groups.server';

import i18n from '~/server/i18n.server';

import Button, { ButtonLink } from '~/components/shared/Button';

import InputError from '~/components/shared/form/InputError';
import { H2, H4, H6 } from '~/components/shared/typography';
import { getSession, requireUser } from '~/server/auth/session.server';
import { handleFormSubmission } from '~/server/actions.server';
import { updateUser } from '~/server/db/users.server';

import Main from '~/components/shared/Main';
import { Spacer } from '~/components/shared/Spacer';
import type { Group, GroupSchedule, Sport } from '~/types';

import DisplayImg from '~/components/shared/DisplayImg';
import { findSports } from '~/server/db/reference.server';
import WhenListEmpty from '~/components/shared/Empty';

import { displayTimeOfDay } from '~/utils/misc';
import {
  findUserFavoriteEvents,
  removeEventFromFavorites
} from '~/server/db/events.server';
import DisplayDate from '~/components/shared/DIsplayDate';

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
  groups: Group[] | [];
  sports: Sport[];
  favorites: Favorite[] | [];
};

export const handle = {
  i18n: ['common', 'me']
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
  schedules?: GroupSchedule[];
  eventDate?: Date;
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);
  const favorites: Favorite[] = [];

  const groups = await findUserGroups(user.id as string);
  const sports = await findSports();
  const favoriteEvents = await findUserFavoriteEvents(user.id as string);
  const favoriteGroups = await findUserFavoriteGroups(user.id as string);

  favoriteGroups &&
    favoriteGroups.map((f) =>
      favorites.push({
        type: 'g',
        id: f.id,
        name: f.name as string,
        slug: f.slug as string,
        image1: f.image1,
        image2: f.image2,
        image3: f.image3,
        image4: null,
        image5: null,
        sportId: f.sportId as number,
        schedules: f.schedules
      })
    );

  favoriteEvents &&
    favoriteEvents.map((f) =>
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

  return json({
    groups,
    sports,
    favorites
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
    const type = favoriteTypeAndId.split('|')[0];
    const favoriteId = favoriteTypeAndId.split('|')[1];

    try {
      if (type === 'g') {
        await removeGroupFromFavorites(user.id, favoriteId);
      } else {
        await removeEventFromFavorites(user.id, favoriteId);
      }

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
  const { groups, sports, favorites } = useLoaderData<LoaderData>() as LoaderData;
  const actionData = useActionData<ActionData>();
  const { t } = useTranslation('me');

  return (
    <Main>
      <div className="flex flex-row justify-between items-center">
        <H2>{t('Your Groups')}</H2>
        <ButtonLink to="/g/group/add">{t('Create Group')}</ButtonLink>
      </div>
      <div className="flex flex-col w-[calc(100%-(50px))] p-4">
        {groups &&
          groups.map((g) => (
            <div className="w-full border-b p-4 last:border-none" key={g.id}>
              <a
                href={`/g/group/${g.id}`}
                className="cursor-pointer"
                data-cy="group-entry"
              >
                <DisplayGroups group={g} sports={sports} key={g.id} t={t} />
              </a>
            </div>
          ))}
      </div>

      <WhenListEmpty list={groups}>
        <H6
          className="text-center p-12"
          variant="secondary"
          as="p"
          data-cy="no-groups"
        >
          {t('No Groups')}
        </H6>
      </WhenListEmpty>

      <Spacer size="xs" className="border-b mb-8" />

      <H2>{t('Your Favorites')}</H2>
      <div className="flex flex-col w-[calc(100%-(50px))] p-4">
        {favorites &&
          favorites.map((f) => (
            <div className="w-full border-b p-4 last:border-none" key={f.id}>
              <a
                href={f.type === 'g' ? `/group/${f.slug}` : `/event/${f.slug}`}
                className="cursor-pointer"
                data-cy="group-entry"
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

function DisplayGroups({
  group,
  sports,
  t
}: {
  group: Group;
  sports: Sport[];
  t: TFunction;
}) {
  const tc = useTranslation('common').t;

  function translateDay(day: number) {
    return tc(
      [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      ][day]
    );
  }

  const schedule = group?.schedules
    ?.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map(
      ({ dayOfWeek, timeOfDay }) =>
        `${translateDay(dayOfWeek)}, ${displayTimeOfDay(timeOfDay)}`
    )
    .join(' | ');

  const entry = {
    id: group.id,
    name: group?.name || '',
    image1: group.image1,
    image2: group.image2,
    image3: group.image3,
    image4: null,
    image5: null
  };

  return (
    <div className="flex flex-row">
      <EntryImage
        entry={entry}
        img={sports.find((s) => s.id === group.sportId)?.picture}
      />
      <div className="flex flex-col gap-y-2 ml-4">
        <H4>{group.name}</H4>
        <div className="flex flex-col">
          <H6 className="dark:text-blueGray-500">{t('Schedules')}</H6>
          <H6>{schedule}</H6>
        </div>
      </div>
    </div>
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
  const tc = useTranslation('common').t;
  const fetcher = useFetcher();

  function translateDay(day: number) {
    return tc(
      [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      ][day]
    );
  }

  const schedule = favorite?.schedules
    ?.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .map(
      ({ dayOfWeek, timeOfDay }) =>
        `${translateDay(dayOfWeek)}, ${displayTimeOfDay(timeOfDay)}`
    )
    .join(' | ');

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
            {favorite.type === 'g' ? (
              <>
                <H6 className="dark:text-blueGray-500">{t('Schedules')}</H6>
                <H6>{schedule}</H6>
              </>
            ) : (
              <>
                <H6 className="dark:text-blueGray-500">{t('Event Date')}</H6>
                <H6>
                  <DisplayDate date={new Date(favorite.eventDate || 0)} />
                </H6>
              </>
            )}
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
  const images: string[] = [image1, image2, image3, image4, image5].filter(Boolean) as string[];

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
