import { Link } from 'remix'
import clsx from 'clsx'
import * as React from 'react'

type Props = {
  to: string
  size?: 'medium' | 'large' | 'small'
} & React.ComponentProps<'a'>

export default function DiciLink({ to, size = 'medium', children }: Props) {
  return (
    <Link
      to={to}
      className={clsx(
        'bg-primary bg-inverse group-hover:border-transparent group-focus:border-transparent',
        { 'px-8 py-5': size === 'medium', 'px-6 py-3': size === 'small' },
        'text-black',
        'focus-ring inset-0 rounded-full opacity-100 disabled:opacity-50 transform transition'
      )}
      style={{
        transition:
          'background-color .2s,color .2s,border-color .2s,box-shadow .2s'
      }}
    >
      {children}
    </Link>
  )
}
