import React from 'react'
import clsx from 'clsx'

type Props = { label?: string } & React.ComponentProps<'div'>
const FormField: React.FC<Props> = ({ className, children }) => {
  return <div className={clsx('mt-4', className)}>{children}</div>
}

export default FormField
