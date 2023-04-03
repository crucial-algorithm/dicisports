import type { ActionFunction, LoaderFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import React from 'react';
import type { TFunction } from 'i18next';

import { Form, useActionData, useLoaderData } from '@remix-run/react';

import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid';

import { useTranslation } from 'react-i18next';

import ProfileFragment from '~/components/ProfileFragment';
import { useRootData } from '~/hooks';
import { findUserGroups } from '~/server/db/groups.server';

import i18n from '~/server/i18n.server';

import Button, { ButtonLink } from '~/components/shared/Button';

import InputError from '~/components/shared/form/InputError';
import { H2, H4, H6 } from '~/components/shared/typography';
import { getSession, requireUser } from '~/server/auth/session.server';
import { handleFormSubmission } from '~/server/actions.server';
import { updateUser } from '~/server/db/users.server';

import Main from '~/components/shared/Main';
import { Spacer } from '~/components/shared/Spacer';
import type { Group, Sport } from '~/types';

import DisplayImg from '~/components/shared/DisplayImg';
import { findSports } from '~/server/db/reference.server';
import WhenListEmpty from '~/components/shared/Empty';

import { displayTimeOfDay } from '~/utils/misc';

const actionIds = {
  logout: 'logout',
  changeDetails: 'change details'
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
};

export const handle = {
  i18n: ['common', 'me']
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);

  const groups = await findUserGroups(user.id as string);
  const sports = await findSports();

  return json({
    groups,
    sports
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
  const { groups, sports } = useLoaderData<LoaderData>() as LoaderData;
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

  return (
    <div className="flex flex-row items-center">
      <GroupImage
        group={group}
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

type PlaceholderImgProps = {
  group: Group;
  className: string;
  img?: string;
};

function PlaceholderImg({ group, img }: PlaceholderImgProps) {
  if (!img) {
    return null;
  }
  return (
    <DisplayImg
      imageId={`product/sports/${img}`}
      alt={group.name || ''}
      variant="List"
    />
  );
}

function GroupImage({ group, img }: { group: Group; img?: string }) {
  function Wrapper({ children }: {} & React.ComponentProps<'div'>) {
    return <div className="w-[100px] h-[100px]">{children}</div>;
  }

  const { image1, image2, image3 } = group;
  const images: string[] = [image1, image2, image3].filter(Boolean) as string[];

  return (
    <Wrapper>
      {images.length === 0 ? (
        <PlaceholderImg
          group={group}
          img={img}
          className="w-full rounded-lg bg-gray-100 dark:bg-gray-400 object-cover object-left-top"
        />
      ) : (
        <DisplayImg
          imageId={image1 || image2 || image3 || ''}
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
