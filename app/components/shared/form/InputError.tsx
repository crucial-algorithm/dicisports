import React from 'react';
import clsx from 'clsx';

type Props = {
  id: string
  children?: React.ReactNode | string | null
} & React.ComponentProps<'div'>
const InputError: React.FC<Props> = ({ id, className, children }) => {
  if (!children) {
    return null;
  }

  return (
    <p role="alert" id={id} className={clsx('text-red-500 text-sm', className)}>
      {children}
    </p>
  );
};

export default InputError;
