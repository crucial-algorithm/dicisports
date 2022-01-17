import React from 'react'
import clsx from 'clsx'
import Label from '~/components/shared/form/Label'
import InputError from '~/components/shared/form/InputError'
import { useId } from '@reach/auto-id'

type Props = {
  label: string
  error?: string | null
  description?: React.ReactNode
} & React.ComponentProps<'div'>

const FormField: React.FC<Props> = ({
  id,
  label,
  className,
  error,
  description,
  children
}) => {
  const prefix = useId()
  const inputId = id ?? `${prefix}-${label}`
  const errorId = `${inputId}-error`
  const descriptionId = `${inputId}-description`

  return (
    <div className={clsx('mb-8', className)}>
      <div className="flex gap-2 items-baseline justify-between mb-2">
        <Label htmlFor={inputId}>{label}</Label>
        {error ? (
          <InputError id={errorId}>{error}</InputError>
        ) : description ? (
          <div id={descriptionId} className="text-primary text-lg">
            {description}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  )
}

export default FormField
