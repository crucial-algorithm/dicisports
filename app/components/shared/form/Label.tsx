import React from 'react'
import clsx from 'clsx'

type Props = {
  id?: string
  htmlFor: string
} & React.ComponentProps<'label'>
const Label: React.FC<Props> = ({ id, htmlFor, className, children }) => (
  <label
    htmlFor={htmlFor}
    className={clsx(
      'inline-block dark:text-blueGray-500 text-gray-500 text-lg',
      className
    )}
  >
    {children}
  </label>
)

export default Label
