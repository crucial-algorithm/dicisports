import React from 'react'
import clsx from 'clsx'

type Props = {
  onClick?: () => void
  ref?: React.MutableRefObject<null>
  rounded?: boolean
  type?: 'button' | 'reset' | 'submit'
  secondary?: boolean
} & React.ComponentProps<'button'>

const BASE_BUTTON = [
  'rounded-full',
  'bg-sp-light-blue-500',
  'hover:bg-sp-light-blue-800',
  'text-white',
  'py-2',
  'px-4',
  'text-sm',
  'font-bold',
  'h-12',
  'focus:shadow-focus',
  'focus:shadow-sp-light-blue-200'
]

const ROUNDED_BUTTON = [
  'p-0',
  'w-8',
  'h-8',
  'bg-gray-100',
  'rounded-full',
  'hover:bg-gray-300',
  'active:shadow-lg',
  'mouse',
  'shadow',
  'transition',
  'ease-in',
  'duration-200',
  'focus:outline-none'
]

const SECONDARY_BUTTON = [
  'rounded-full',
  'bg-with-100',
  'border',
  'border-sp-light-blue',
  'text-sp-light-blue',
  'hover:bg-sp-light-blue-500',
  'hover:text-white',
  'py-2',
  'px-4',
  'text-sm',
  'font-bold',
  'h-12',
  'focus:shadow-focus',
  'focus:shadow-sp-light-blue-200'
]

function classes(rounded: boolean, secondary: boolean) {
  if (rounded) return ROUNDED_BUTTON.join(' ')
  if (secondary) return SECONDARY_BUTTON.join(' ')
  return BASE_BUTTON.join(' ')
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
