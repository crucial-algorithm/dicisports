import React, { ReactNode } from 'react'
import { Group, TranslationObject } from '~/types'
import { H2 } from '~/components/shared/typography'
import { useTranslation } from 'react-i18next'
import I18nText from '~/components/I18nText'

type Props = {
  actions?: React.ReactNode
  footer?: ReactNode
  group: Group
} & React.ComponentProps<'div'>

export default function GroupEntry({ group, actions, footer }: Props) {
  const { t } = useTranslation('m-groups')
  const tc = useTranslation('common').t
  const day = tc(
    [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ][group.dayOfWeek]
  )
  return (
    <div className="border-b-2 border-gray-700 dark:border-gray-300 h-80 p-4 relative mb-12">
      <div className="w-full h-full">
        <div className="flex flex-col">
          <H2 className="mb-6">{group.name}</H2>
          <Feature label={t('When')} value={`${day}, ${group.timeOfDay}`} />
          <Feature
            label={t('Who')}
            value={group.createdBy?.name || group.createdById}
          />
          <Feature label={t('Where')} value={group.near || ''} />
          <Feature label={t('Purpose')} value={group.groupSpirit?.name || ''} />
        </div>
      </div>
      {actions ? <div className="list-entry-actions p-4">{actions}</div> : null}
      {footer ? <div className="list-entry-footer">{footer}</div> : null}
    </div>
  )
}

function Feature({
  label,
  value
}: {
  label: string
  value: string | TranslationObject
}) {
  return (
    <>
      <div className="flex flex-col mb-4">
        <div className="inline-block dark:text-blueGray-500 text-gray-500 text-sm">
          {label}
        </div>
        <div className="inline-block dark:text-white text-gray-500 text-base">
          {typeof value === 'string' ? value : <I18nText text={value} />}
        </div>
      </div>
    </>
  )
}
