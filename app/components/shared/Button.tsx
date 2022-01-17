import React from 'react'
import clsx from 'clsx'

type Props = {
  onClick?: () => void
  ref?: React.MutableRefObject<null>
  rounded?: boolean
  type?: 'button' | 'reset' | 'submit'
  secondary?: boolean
} & React.ComponentProps<'button'>

function classes(rounded: boolean, secondary: boolean) {
  if (rounded) {
    return clsx(
      'rounder-full p-0 w-8 h-8 bg-gray-100 mouse shadow',
      'focus:outline-none hover:bg-gray-300 active:shadow-lg',
      'transition ease-in duration-200 '
    )
  }
  return clsx(
    'rounded-full h-12 py-2 px-4 text-sm font-bold',
    // focus
    'focus:shadow-focus focus:shadow-sp-light-blue-200',
    // colors variations
    secondary && 'bg-with-100 text-sp-light-blue border border-sp-light-blue',
    !secondary && 'bg-sp-light-blue-500 text-white',
    // hover
    secondary && 'hover:bg-sp-light-blue-500 hover:text-white',
    !secondary && 'hover:bg-sp-light-blue-800'
  )
}

const Button: React.FC<Props> = ({
  onClick,
  rounded = false,
  ref,
  children,
  type = 'submit',
  secondary = false,
  className,
  disabled
}) => (
  <button
    type={type}
    className={clsx(
      classes(rounded, secondary),
      disabled ? 'bg-slate-500 hover:bg-slate-600' : null,
      className
    )}
    style={{
      transition:
        'background-color .2s,color .2s,border-color .2s,box-shadow .2s'
    }}
    onClick={onClick}
    ref={ref}
    disabled={disabled}
  >
    {children}
  </button>
)

export default Button
