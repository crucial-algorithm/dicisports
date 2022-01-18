import { useTranslation } from 'react-i18next'
import Main from '~/components/shared/Main'
import { H2 } from '~/components/shared/typography'
import { json, Link, LoaderFunction } from 'remix'
import * as React from 'react'
import i18n from '~/server/i18n.server'

export let loader: LoaderFunction = async ({ request }) => {
  return json({
    i18n: await i18n.getTranslations(request, ['meeting-points'])
  })
}

export default function MeetingPoints() {
  let { t } = useTranslation('meeting-points')

  return (
    <Main className="dark:text-blueGray-500">
      <H2 className="mb-6">{t('slug')}</H2>
    </Main>
  )
}
