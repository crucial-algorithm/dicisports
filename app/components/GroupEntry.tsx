import React, { ReactNode } from 'react'
import { Group, TranslationObject } from '~/types'
import { H2 } from '~/components/shared/typography'
import { useTranslation } from 'react-i18next'
import I18nText from '~/components/I18nText'
import DisplayImg from '~/components/shared/DisplayImg'
import { displayTimeOfDay } from '~/utils/misc'
import clsx from 'clsx'
import { IdentificationIcon, LocationMarkerIcon, SparklesIcon } from '@heroicons/react/outline'

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
    <div
      className={clsx(
        'relative flex mb-12',
        'flex-col',
        'md:flex-row',
        'p-4',
        'border-b last:border-none border-gray-300 dark:border-gray-300'
      )}
    >
      <div className="w-full m-auto flex p-2 md:max-w-sm lg:max-w-md md:h-72">
        {group.image1 ? (
          <DisplayImg id={group.image1 || ''} alt={group.name || ''} />
        ) : (
          <PlaceholderImg
            group={group}
            img={img}
            className="w-full rounded-lg bg-gray-100 dark:bg-gray-400 object-cover object-left-top"
          />
        )}
      </div>
      <div className="w-full h-full p-2">
        <div className="flex flex-col">
          <span className={clsx('mb-4 text-base font-medium')}>
            {`${day}, ${displayTimeOfDay(group.timeOfDay)}`}
          </span>
          <span className={clsx('mb-4 text-lg font-bold')}>{group.name}</span>
          <Feature
            label={t('Who')}
            value={group.createdBy?.name || group.createdById}
          />
          <Feature label={t('Where')} value={group.near || ''} />
          <div className="flex justify-between align-middle">
            <Feature
              label={t('Purpose')}
              value={group.groupSpirit?.name || ''}
            />
            {footer ? <div className="flex content-end">{footer}</div> : null}
          </div>
        </div>
      </div>
      {actions ? (
        <div className="absolute top-0 right-0 p-4 pt-6">{actions}</div>
      ) : null}
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
  value,
  label
}: {
  value: string | TranslationObject
  label?: string
}) {
  return (
    <>
      <div className="flex flex-col align-middle mb-4">
        <div className="dark:text-blueGray-500 text-sm font-medium mr-2">
          {label}
        </div>
        <div className="inline-block dark:text-white text-gray-500 text-base">
          {typeof value === 'string' ? value : I18nText({ text: value })}
        </div>
      </div>
    </>
  )
}
