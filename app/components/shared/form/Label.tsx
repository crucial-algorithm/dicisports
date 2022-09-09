import React from 'react';
import clsx from 'clsx';

type Props = {
  id?: string
  htmlFor: string
  variant?: 'primary' | 'secondary' | 'third'
} & React.ComponentProps<'label'>
const Label: React.FC<Props> = ({ variant, htmlFor, className, children }) => (
  <label
    htmlFor={htmlFor}
    className={clsx(
      'inline-block',
      {
        'dark:text-blueGray-500 text-gray-500 text-lg':
          !variant || variant === 'primary',
        'dark:text-white text-gray-600 text-sm': variant === 'secondary',
        'dark:text-white text-gray-600 text-lg': variant === 'third'
      },
      className
    )}
  >
    {children}
  </label>
);

export default Label;
