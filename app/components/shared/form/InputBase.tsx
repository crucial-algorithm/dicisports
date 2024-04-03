import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import clsx from 'clsx';

type Props = {
  id: string;
  name: string;
  placeholder?: string | undefined;
  defaultValue?: any;
  autoComplete?: string | undefined;
  disabled?: boolean | undefined;
  input?: React.RefObject<HTMLInputElement> | undefined;
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
  onClick,
  step,
  onBlur
}) => {
  const [value, setValue] = useState<string>(defaultValue);

  function handleOnChange(e: ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
    onChange && onChange(e);
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
        step={step}
        ref={input}
        onClick={onClick}
        onBlur={onBlur}
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
      step={step}
      onClick={onClick}
      onBlur={onBlur}
    />
  );
};

export default InputBase;
