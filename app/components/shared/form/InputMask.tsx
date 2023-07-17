import * as React from 'react';
import type { InputMaskProps } from 'primereact/inputmask';
import { InputMask } from 'primereact/inputmask';
import { useContext } from 'react';

import { FormContext } from '~/components/shared/form/UploadForm';

type InputMaskOptions = {
  placeHolder?: string;
} & InputMaskProps;

function DiciInputMask({
  name,
  placeHolder,
  value,
  className,
  mask
}: InputMaskOptions) {
  const formProps = useContext(FormContext);

  if (formProps.readOnly) {
    return (
      <div className="font-medium dark:text-white">{value ? value : ''}</div>
    );
  }

  return (
    <InputMask
      name={name}
      placeholder={placeHolder}
      value={value}
      className={className}
      mask={mask}
    />
  );
}

export { DiciInputMask };