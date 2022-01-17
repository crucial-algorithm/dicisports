import React from 'react'
import clsx from 'clsx'

type Props = {
  id?: string
} & React.ComponentProps<'label'>
const Label: React.FC<Props> = ({ id, className, children }) => (
  <label
    htmlFor={id}
    className={clsx(
      'inline-block dark:text-blueGray-500 text-gray-500 text-lg mb-4',
      className
    )}
  >
    {children}
  </label>
)

export default Label
