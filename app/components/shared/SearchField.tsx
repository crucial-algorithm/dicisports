import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { useDebounceFn } from 'ahooks';
import clsx from 'clsx';
import type { ChangeEvent } from 'react';
import React, { useCallback, useRef, useState } from 'react';

import Button from '~/components/shared/Button';

type props = {
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;
  debounceTime?: number;
  defaultValue?: string
} & Omit<React.ComponentProps<'input'>, 'onChange' | 'defaultValue'>;

export default function SearchField({
  name,
  onChange = () => {},
  placeholder,
  debounceTime: wait = 500,
  defaultValue = '',
  className
}: props) {
  const [value, setValue] = useState(defaultValue || '');
  const input = useRef<HTMLInputElement>(null);
  const { run: onChangeDebounced } = useDebounceFn(onChange, { wait });
  const handleValueChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChangeDebounced(e.target.value);
      setValue(e.target.value);
    },
    [onChangeDebounced]
  );

  const handleClear = useCallback(() => {
    // why are we doing this? In case we are using search within the form, form would submit before the
    // setValue had been applied
    if (input?.current?.value) {
      input.current.value = '';
    }
    setValue('');
    onChange('');
  }, [onChange]);

  return (
    <>
      <div className="mt-1 relative rounded-md shadow-sm">
        <input
          ref={input}
          name={name}
          onChange={handleValueChange}
          type="text"
          className={clsx('input-text', className)}
          value={value}
          placeholder={placeholder}
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          {value && (
            <Button variant="adornment" type="button" onClick={handleClear}>
              <XMarkIcon className="w-6 h-6 mr-2" />
            </Button>
          )}

          {!value && <MagnifyingGlassIcon className="w-6 h-6 mr-2" />}
        </div>
      </div>
    </>
  );
}
