import * as React from 'react';

import { useId } from '@reach/auto-id';
import clsx from 'clsx';

import Label from '~/components/shared/form/Label';
import type { TranslationObject } from '~/types';
import I18nText from '~/components/I18nText';

type CheckBoxOptions = {
  name: string
  label: TranslationObject | string
} & React.ComponentProps<'input'>

export default function CheckBox({
  value,
  name,
  label,
  className,
  checked
}: CheckBoxOptions) {
  const id = useId() || '';

  return (
    <div className={clsx('flex align-middle justify-between', className)}>
      <Label variant="secondary" htmlFor={id}>
        {typeof label === 'string' ? label : I18nText({ text: label })}
      </Label>
      <input
        id={id}
        name={name}
        value={value}
        type="checkbox"
        defaultChecked={checked}
        className={clsx(
          'form-checkbox h-6 w-6 text-gray-900 dark:text-blueGray-500',
          'dark:border-none',
          'ring-0 focus:ring-offset-0 focus:ring-0 focus:shadow-none'
        )}
      />
    </div>
  );
}
