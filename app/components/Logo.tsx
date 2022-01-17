import * as React from 'react'
import clsx from 'clsx'

type Props = {
  xxl?: boolean
} & React.ComponentProps<'div'>

export default function Logo({ xxl = false, className }: Props) {
  return (
    <h1
      className={clsx(
        className,
        'flex items-center',
        'text-sp-blue-500 dark:text-white font-extrabold',
        xxl ? 'text-6xl' : 'text-3xl'
      )}
    >
      DiciSports
    </h1>
  )
}
