import React, { useState } from 'react'
import clsx from 'clsx'

export function inputBaseClasses(className?: string) {
  return clsx(
    'px-11 py-4 w-full rounded-lg focus-ring',
    'bg-gray-100 text-black placeholder-gray-500 text-lg font-medium',
    'dark:disabled:text-blueGray-500 dark:text-white dark:bg-gray-800',
    'disabled:text-gray-400',
    className
  )
}

type Props = {
  id: string
  name: string
  placeholder?: string
  defaultValue?: any
  type?: 'text' | 'number' | 'email' | 'date' | 'hidden'
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
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        setValue(e.target.value)
        onChange && onChange(e.target.value)
      }}
      autoComplete={name}
      className={inputBaseClasses(className)}
      readOnly={readOnly}
    />
  )
}

export default InputBase
