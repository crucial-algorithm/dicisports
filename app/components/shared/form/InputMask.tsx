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
  mask,
  onChange
}: InputMaskProps) {
  const formProps = useContext(FormContext);

  if (formProps.readOnly) {
    return (
      <div className="font-medium dark:text-white">{value ? value : ''}</div>
    );
  }

  function handleOnChange(e: any) {
    formProps.setDirty && formProps.setDirty();
    onChange && onChange(e);
  }

  return (
    <InputMask
      name={name}
      placeholder={placeholder}
      value={value}
      className={clsx('dici-input-mask', className)}
      mask={mask}
      onChange={handleOnChange}
    />
  );
}

export { DiciInputMask };