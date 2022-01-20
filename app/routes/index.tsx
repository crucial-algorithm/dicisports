import * as React from 'react'
import type { LoaderFunction } from 'remix'
import { Link } from 'remix'
import { useTranslation } from 'react-i18next'
import Main from '~/components/shared/Main'
import { H2 } from '~/components/shared/typography'
import CAGResponse from '~/server/response.server'

export let loader: LoaderFunction = async ({ request }) => {
  return CAGResponse(request, ['home'])
}

export default function Index() {
  let { t } = useTranslation('home')

  return (
    <Main className="dark:text-blueGray-500">
      <H2 className="mb-6">{t('title')}</H2>
      <Link to="/organizer">Organizer</Link>
    </Main>
  )
}
