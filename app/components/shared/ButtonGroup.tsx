import React from 'react'
import clsx from 'clsx'

type Props = {} & React.ComponentProps<'div'>

export default function ButtonGroup({ children, className }: Props) {
  return (
    <div
      className={clsx(
        'flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0',
        className
      )}
    >
      {children}
    </div>
  )
}
