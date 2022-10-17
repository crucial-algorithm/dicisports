import React from 'react';
import clsx from 'clsx';

import { useId } from '@reach/auto-id';

import Label from '~/components/shared/form/Label';
import InputError from '~/components/shared/form/InputError';

type Props = {
  label: string
  error?: string | null
  description?: React.ReactNode
  e2e?: string
} & React.ComponentProps<'div'>

const FormField: React.FC<Props> = ({
  id,
  label,
  className,
  error,
  description,
  children,
  e2e
}) => {
  const prefix = useId();
  const inputId = id ?? `${prefix}-${label}`;
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;

  return (
    <div className={clsx('mb-8', className)} data-e2e={e2e}>
      <div className="flex gap-2 items-baseline justify-between mb-2">
        <Label htmlFor={inputId}>{label}</Label>
        {description ? (
          <div id={descriptionId} className="text-primary text-lg">
            {description}
          </div>
        ) : null}
      </div>
      {children}
      {error ? <InputError className="mt-2" id={errorId}>{error}</InputError> : null }
    </div>
  );
};

export default FormField;
