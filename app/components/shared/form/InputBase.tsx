import React, { useState } from 'react'
import clsx from 'clsx'

export function inputBaseClasses(className?: string) {
  return clsx(
    'w-full rounded-lg focus-ring',
    'text-base md:text-lg',
    'bg-gray-100 text-black placeholder-gray-500 font-medium',
    'dark:disabled:text-blueGray-500 dark:text-white dark:bg-gray-800',
    'disabled:text-gray-400',
    {
      'px-11': !className || className.indexOf('px') < 0,
      'py-4': !className || className.indexOf('py') < 0
    },
    // added to remove border added by @tailwindcss/forms
    'border-0',
    className
  )
}

type Props = {
  id: string
  name: string
  placeholder?: string
  defaultValue?: any
  type?: 'text' | 'number' | 'email' | 'date' | 'hidden' | 'checkbox'
  autoComplete?: string
  disabled?: boolean
  onChange?: (value: any) => void
} & React.ComponentProps<'input'>
const InputBase: React.FC<Props> = ({
  id,
  name,
  placeholder,
  defaultValue,
  autoComplete,
  disabled = false,
  type = 'text',
  onChange,
  className,
  readOnly = false
}) => {
  const [value, setValue] = useState<string>(defaultValue || '')
  return (
    <input
      type={type}
      name={name}
      id={id}
      value={disabled ? defaultValue : value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={
        disabled
          ? undefined
          : (e) => {
              setValue(e.target.value)
              onChange && onChange(e.target.value)
            }
      }
      autoComplete={autoComplete}
      className={inputBaseClasses(className)}
      readOnly={readOnly}
    />
  )
}

export default InputBase
