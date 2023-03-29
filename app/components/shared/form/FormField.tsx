import React from 'react';
import clsx from 'clsx';

import Label from '~/components/shared/form/Label';
import InputError from '~/components/shared/form/InputError';

type Props = {
  label: string
  error?: string | null
  description?: React.ReactNode
  dataCy?: string
} & React.ComponentProps<'div'>

const FormField: React.FC<Props> = ({
  id,
  label,
  className,
  error,
  description,
  children,
  dataCy,
  onClick
}) => {
  const inputId = id ?? `ff-${label}`;
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;

  return (
    <div className={clsx('mb-8', className)} data-cy={dataCy} onClick={onClick}>
      <div className="flex gap-2 items-baseline justify-between mb-2">
        <Label htmlFor={inputId}>{label}</Label>
        {description && (
          <div id={descriptionId} className="text-primary text-lg">
            {description}
          </div>
        )}
      </div>
      {children}
      {error ? <InputError className="mt-2" id={errorId}>{error}</InputError> : null }
    </div>
  );
};

export default FormField;
