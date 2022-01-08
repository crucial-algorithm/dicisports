import * as React from 'react'
import type { LoaderFunction, MetaFunction } from 'remix'
import { json, Link } from 'remix'
import i18n from '~/utils/i18n.server' // this is the first file you created
import { useTranslation } from 'react-i18next'

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
    <React.Fragment>
      <h1>{t('title')}</h1>
      <Link to="/organizer">Organizer</Link>
    </React.Fragment>
  )
}
