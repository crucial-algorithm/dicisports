import React from 'react'

type Props = {
  onClick?: () => void
  ref?: React.MutableRefObject<null>
  rounded?: boolean
  type?: 'button' | 'reset' | 'submit'
  secondary?: boolean
} & React.ComponentProps<'button'>

const BASE_BUTTON = [
  'py-2',
  'px-4',
  'inline-flex',
  'justify-center',
  'border',
  'border-transparent',
  'shadow-sm',
  'text-sm',
  'font-medium',
  'rounded-md',
  'text-white',
  'bg-indigo-600',
  'hover:bg-indigo-700',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'focus:ring-indigo-500'
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

const Button: React.FC<Props> = ({
  onClick,
  rounded = false,
  ref,
  children,
  type = 'submit',
  secondary = false,
  className
}) => (
  <button
    type={type}
    className={
      (rounded ? ROUNDED_BUTTON : BASE_BUTTON).join(' ') + ' ' + className
    }
    onClick={onClick}
    ref={ref}
  >
    {children}
  </button>
)

export default Button
