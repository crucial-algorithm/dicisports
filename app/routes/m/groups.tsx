import { useTranslation } from 'react-i18next';

import type { ActionFunction, LoaderFunction } from 'remix';
import { json, redirect } from 'remix';
import * as React from 'react';

import { Form, useLoaderData } from '@remix-run/react';

import { PencilSquareIcon } from '@heroicons/react/24/outline';

import { HeartIcon as HeartIconActive } from '@heroicons/react/24/solid';

import { findSports } from '~/server/db/sports.server';
import type { Group, Sport } from '~/types';
import Button, { ButtonLink } from '~/components/shared/Button';


import { H3, H4, H6 } from '~/components/shared/typography';
import Main from '~/components/shared/Main';
import InputError from '~/components/shared/form/InputError';
import { requireUser } from '~/server/auth/session.server';
import {
  findUserFavoriteGroups,
  findUserGroups,
  removeGroupFromFavorites
} from '~/server/db/groups.server';
import GroupEntry from '~/components/GroupEntry';
import ButtonGroup from '~/components/shared/ButtonGroup';
import WhenListEmpty from '~/components/shared/Empty';
import i18n from '~/server/i18n.server';

type LoaderData = {
  sports: Sport[];
  groups: Group[];
  favorites: Group[];
};

const actionIds = {
  create: 'create',
  changeDetails: 'change details'
};

export const handle = {
  i18n: 'm-groups'
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request);

  return json({
    sports: await findSports(),
    groups: await findUserGroups(user.id),
    favorites: await findUserFavoriteGroups(user.id)
  });
};

export const action: ActionFunction = async ({ request }) => {
  const t = await i18n.getFixedT(request, 'm-groups');
  const user = await requireUser(request);
  const data = await request.formData();
  const groupId: string | null = data.get('groupId') as string;

  if (!groupId) {return json({});}
  await removeGroupFromFavorites(user.id, groupId);
  return redirect(`/m/groups?message=${t('Favorite Removed')}`);
};

export default function Groups() {
  const { t } = useTranslation('m-groups');
  const { groups, sports, favorites } = useLoaderData<LoaderData>();

  return (
    <Main className="dark:text-blueGray-500">
      <div className="col-span-full mb-12 lg:mb-12">
        <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
          <div />
          <Form method="post" action="/m/group/add">
            <input type="hidden" name="actionId" value={actionIds.create} />
            <Button variant="secondary" name="create-group">
              <H6 as="span">{t('Create')}</H6>
            </Button>
          </Form>
        </div>
      </div>
      <InputError id="general-error" />
      <H3>{t('My Groups')}</H3>
      <div className="col-span-full mb-24 lg:col-span-5 lg:mb-0">
        {groups.map((group: Group) => (
          <GroupEntry
            group={group}
            key={group.id}
            img={sports.find((s: Sport) => s.id === group.sportId)?.picture}
            actions={
              <ButtonGroup>
                <ButtonLink size="small" to={`/m/group/${group.id}`}>
                  <PencilSquareIcon className="h-6 w-6 m-0 inline-block" />
                </ButtonLink>
              </ButtonGroup>
            }
          />
        ))}
        <WhenListEmpty list={groups}>
          <H4 variant="secondary" as="p" className="mb-12">
            {t('Groups Empty')}
          </H4>
        </WhenListEmpty>
      </div>
      <H3>{t('Favorite Groups')}</H3>
      <div className="col-span-full mb-24 lg:col-span-5 lg:mb-0">
        {favorites.sort((a: any, b: any) => (new Date(a.createdAt)).getTime() - (new Date(b.createdAt)).getTime()).map((group: Group, index: number) => (
          <GroupEntry
            group={group}
            key={group.id}
            img={sports.find((s: Sport) => s.id === group.sportId)?.picture}
            actions={
              <ButtonGroup>
                <Form method="post">
                    <Button size="tiny" name="groupId" value={group.id} id={`remove-favorite-${index}`}>
                    <HeartIconActive className="h-6 w-6 m-0 inline-block" />
                  </Button>
                </Form>
              </ButtonGroup>
            }
          />
        ))}
        <WhenListEmpty list={favorites}>
          <H4 variant="secondary" as="p" data-cy="empty-favorites">
            {t('Favorite Groups Empty')}
          </H4>
        </WhenListEmpty>
      </div>
    </Main>
  );
}
