import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import clsx from 'clsx';

type Props = {
  id: string;
  name: string;
  placeholder?: string;
  defaultValue?: any;
  type?: 'text' | 'number' | 'email' | 'date' | 'hidden' | 'checkbox';
  autoComplete?: string;
  disabled?: boolean;
  onChange?: (value: any) => void;
  input?: React.RefObject<HTMLInputElement>;
} & React.ComponentProps<'input'>;
const InputBase: React.FC<Props> = ({
  id,
  name,
  placeholder,
  defaultValue,
  autoComplete,
  disabled = false,
  type = 'text',
  onChange,
  className,
  readOnly = false,
  input,
  onClick
}) => {
  const [value, setValue] = useState<string>(defaultValue);

  function handleOnChange(e: ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
    onChange && onChange(e.target.value);
  }

  // hack: when using outside ref, use a controlled component throughout the control lifecycle
  if (input) {
    return (
      <input
        type={type}
        name={name}
        id={id}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        onChange={disabled ? undefined : handleOnChange}
        autoComplete={autoComplete}
        className={clsx('input-text', className)}
        readOnly={readOnly}
        ref={input}
        onClick={onClick}
      />
    );
  }

  return (
    <input
      type={type}
      name={name}
      id={id}
      value={disabled ? defaultValue : value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={disabled ? undefined : handleOnChange}
      autoComplete={autoComplete}
      className={clsx('input-text', className)}
      readOnly={readOnly}
      onClick={onClick}
    />
  );
};

export default InputBase;
