import React from 'react'
import clsx from 'clsx'

type Props = {
  density?: 'comfortable' | 'compact'
} & React.ComponentProps<'div'>

export default function ButtonGroup({ children, className, density }: Props) {
  return (
    <div
      className={clsx(
        'flex flex-col',
        {
          'space-y-4 md:flex-row md:space-x-4 md:space-y-0':
            !density || density === 'comfortable',
          'space-y-2 md:flex-row md:space-x-2 md:space-y-0':
            density === 'compact'
        },
        className
      )}
    >
      {children}
    </div>
  )
}
