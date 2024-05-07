import React from 'react';
import clsx from 'clsx';

type Props = {
  id: string;
  children?: React.ReactNode | string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
} & React.ComponentProps<'div'>
const InputError: React.FC<Props> = ({ id, className, children, size = 'sm' }) => {
  if (!children) {
    return null;
  }

  return (
    <p role="alert" id={id} className={clsx(`text-blaze-orange-500 text-${size}`, className)}>
      {children}
    </p>
  );
};

export default InputError;
