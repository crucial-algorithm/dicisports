import { useTranslation } from 'react-i18next'
import Main from '~/components/shared/Main'
import { H2 } from '~/components/shared/typography'
import { LoaderFunction } from 'remix'
import * as React from 'react'
import CAGResponse from '~/server/response.server'
import { findSports } from '~/server/db/sports.server'
import { useLoaderData } from '@remix-run/react'
import { Sport } from '@prisma/client'
import I18nText from '~/components/I18nText'
import { TranslationObject } from '~/types'

type LoaderData = {
  sports: Array<Sport>
}

export let loader: LoaderFunction = async ({ request }) => {
  return CAGResponse(request, {
    sports: await findSports()
  })
}

export default function MeetingPoints() {
  let { t } = useTranslation('meeting-points')
  const { sports } = useLoaderData<LoaderData>()

  return (
    <Main className="dark:text-blueGray-500">
      <H2 className="mb-6">{t('slug')}</H2>
      <ul>
        {sports.map((sport) => (
          <li key={sport.id}>
            <I18nText text={sport.name as TranslationObject} />
          </li>
        ))}
      </ul>
    </Main>
  )
}
