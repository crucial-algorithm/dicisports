import { useTranslation } from 'react-i18next'
import Main from '~/components/shared/Main'
import { H6 } from '~/components/shared/typography'
import { ActionFunction, LoaderFunction } from 'remix'
import * as React from 'react'
import CAGResponse from '~/server/response.server'
import { findSports } from '~/server/db/sports.server'
import { Form, useLoaderData } from '@remix-run/react'
import { Group, Sport } from '~/types'
import Button from '~/components/shared/Button'
import { CalendarIcon, ShareIcon } from '@heroicons/react/outline'
import InputError from '~/components/shared/form/InputError'
import { requireUser } from '~/server/auth/session.server'
import { findUserGroups } from '~/server/db/groups.server'
import GroupEntry from '~/components/GroupEntry'
import ButtonGroup from '~/components/shared/ButtonGroup'

type LoaderData = {
  sports: Array<Sport>
  groups: Array<Group>
}

const actionIds = {
  create: 'create',
  changeDetails: 'change details'
}

type ActionData = {
  status: 'success' | 'error'
  fields: {
    name?: string | null
  }
  errors: {
    generalError?: string | null
    name?: string | null
  }
}

export let loader: LoaderFunction = async ({ request }) => {
  const user = await requireUser(request)
  return CAGResponse(request, {
    sports: await findSports(),
    groups: await findUserGroups(user.id)
  })
}

export const action: ActionFunction = async ({ request }) => {}

export default function MeetingPoints() {
  let { t } = useTranslation('meeting-points')
  const { groups } = useLoaderData<LoaderData>()

  return (
    <Main className="dark:text-blueGray-500">
      <div className="col-span-full mb-12 lg:mb-12">
        <div className="flex flex-col-reverse items-start justify-between lg:flex-row lg:items-center">
          <div />
          <Form method="post">
            <input type="hidden" name="actionId" value={actionIds.create} />
            <Button secondary={true}>
              <H6 as="span">{t('Create')}</H6>
            </Button>
          </Form>
        </div>
      </div>
      <InputError id="general-error" />

      <div className="col-span-full mb-24 lg:col-span-5 lg:mb-0">
        {groups.map((group) => (
          <GroupEntry
            group={group}
            key={group.id}
            actions={
              <ButtonGroup>
                <Button size="small">
                  <ShareIcon className="h-6 w-6 m-0 inline-block" />
                </Button>
                <Button size="small">
                  <CalendarIcon className="h-6 w-6 m-0 inline-block" />
                </Button>
              </ButtonGroup>
            }
          />
        ))}
      </div>
    </Main>
  )
}
