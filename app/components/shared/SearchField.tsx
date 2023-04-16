import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid';
import type { ChangeEvent } from 'react';
import React, { useCallback, useState } from 'react';

import Button from '~/components/shared/Button';

type props = {
  onChange: (value: string) => void;
} & Omit<React.ComponentProps<'input'>, 'onChange'>;

export default function SearchField({ name, onChange, placeholder }: props) {
  const [value, setValue] = useState('');
  const handleValueChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setValue(e.target.value);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    setValue('');
    onChange('');
  }, [onChange]);

  return (
    <>
      <div className="mt-1 relative rounded-md shadow-sm">
        <input
          name={name}
          onChange={handleValueChange}
          type="text"
          className="input-text"
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
