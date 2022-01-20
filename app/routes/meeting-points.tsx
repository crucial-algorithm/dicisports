import { useTranslation } from 'react-i18next'
import Main from '~/components/shared/Main'
import { H2 } from '~/components/shared/typography'
import { LoaderFunction } from 'remix'
import * as React from 'react'
import CAGResponse from '~/server/response.server'

export let loader: LoaderFunction = async ({ request }) => {
  return CAGResponse(request)
}

export default function MeetingPoints() {
  let { t } = useTranslation('meeting-points')

  return (
    <Main className="dark:text-blueGray-500">
      <H2 className="mb-6">{t('slug')}</H2>
    </Main>
  )
}
