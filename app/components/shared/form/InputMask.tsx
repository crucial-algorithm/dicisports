import * as React from 'react';
import type { InputMaskProps } from 'primereact/inputmask';
import { InputMask } from 'primereact/inputmask';
import { useContext } from 'react';
import clsx from 'clsx';

import { FormContext } from '~/components/shared/form/UploadForm';

function DiciInputMask({
  name,
  placeholder,
  value,
  className,
  mask
}: InputMaskProps) {
  const formProps = useContext(FormContext);

  if (formProps.readOnly) {
    return (
      <div className="font-medium dark:text-white">{value ? value : ''}</div>
    );
  }

  return (
    <InputMask
      name={name}
      placeholder={placeholder}
      value={value}
      className={clsx('input-text', className)}
      mask={mask}
    />
  );
}

export { DiciInputMask };