import React, { ReactNode } from 'react'
import { Group, TranslationObject } from '~/types'
import { H2 } from '~/components/shared/typography'
import { useTranslation } from 'react-i18next'
import I18nText from '~/components/I18nText'
import DisplayImg from '~/components/shared/DisplayImg'
import { displayTimeOfDay } from '~/utils/misc'
import clsx from 'clsx'

type Props = {
  actions?: React.ReactNode
  footer?: ReactNode
  group: Group
  img?: string
} & React.ComponentProps<'div'>

export default function GroupEntry({ group, actions, footer, img }: Props) {
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
    <div className="border-b last:border-none border-gray-300 dark:border-gray-300 p-4 relative mb-12 flex">
      <div className="w-144 flex p-2">
        {group.image1 ? (
          <DisplayImg id={group.image1 || ''} alt={group.name || ''} />
        ) : (
          <PlaceholderImg
            group={group}
            img={img}
            className="w-full rounded-lg object-cover bg-gray-100 dark:bg-gray-400"
          />
        )}
      </div>
      <div className="w-full h-full">
        <div className="flex flex-col">
          <H2
            className={clsx('mb-2', {
              'mr-24': !!actions
            })}
          >
            {group.name}
          </H2>
          <Feature
            label={t('When')}
            value={`${day}, ${displayTimeOfDay(group.timeOfDay)}`}
          />
          <Feature
            label={t('Who')}
            value={group.createdBy?.name || group.createdById}
          />
          <Feature label={t('Where')} value={group.near || ''} />
          <Feature label={t('Purpose')} value={group.groupSpirit?.name || ''} />
        </div>
      </div>
      {actions ? (
        <div className="list-entry-actions p-4 pr-0">{actions}</div>
      ) : null}
      {footer ? <div className="list-entry-footer">{footer}</div> : null}
    </div>
  )
}

function PlaceholderImg({
  group,
  img
}: {
  group: Group
  className: string
  img?: string
}) {
  if (!img) return null
  return <DisplayImg id={`product/sports/${img}`} alt={group.name || ''} />
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
        <div className="inline-block dark:text-blueGray-500 text-sm font-medium">
          {label}
        </div>
        <div className="inline-block dark:text-white text-gray-500 text-base">
          {typeof value === 'string' ? value : I18nText({ text: value })}
        </div>
      </div>
    </>
  )
}
