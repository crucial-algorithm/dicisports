import * as React from 'react'
import type { LoaderFunction, MetaFunction } from 'remix'
import { json, Link } from 'remix'
import i18n from '~/server/i18n.server' // this is the first file you created
import { useTranslation } from 'react-i18next'
import Main from '~/components/shared/Main'
import { H2 } from '~/components/shared/typography'

export const meta: MetaFunction = () => {
  return {
    title: 'Remix Starter',
    description: 'Welcome to remix!'
  }
}

export let loader: LoaderFunction = async ({ request }) => {
  return json({
    i18n: await i18n.getTranslations(request, ['common'])
  })
}

export default function Index() {
  let { t } = useTranslation('common')

  return (
    <Main className="dark:text-blueGray-500">
      <H2 className="mb-6">{t('title')}</H2>
      <Link to="/organizer">Organizer</Link>
    </Main>
  )
}
