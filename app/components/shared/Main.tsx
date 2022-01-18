import * as React from 'react'
import clsx from 'clsx'

type Props = {} & React.ComponentProps<'main'>

export default function Main({ className, children }: Props) {
  return <main className={clsx(className, 'mx-10vw')}>{children}</main>
}
