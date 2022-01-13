import React, { useState } from 'react'
import clsx from 'clsx'

export const InputClasses = [
  'block',
  'w-full',
  'px-4',
  'py-2',
  'mt-1',
  'border',
  'border-gray-300',
  'rounded-md',
  'shadow-sm',
  'focus:ring-indigo-500',
  'focus:border-indigo-500',
  'sm:text-sm'
].join(' ')

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
      className={clsx(InputClasses, className)}
      readOnly={readOnly}
    />
  )
}

export default InputBase
