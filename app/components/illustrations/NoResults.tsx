import React from 'react'
import { useTranslation } from 'react-i18next'
import { H2 } from '~/components/shared/typography'

type Props = {} & React.ComponentProps<'svg'>

export default function NoResults({ className }: Props) {
  const { t } = useTranslation('common')
  return <H2>{t('No results found')}</H2>
}
