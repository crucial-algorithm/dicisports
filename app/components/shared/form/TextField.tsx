import React from 'react';

import HTMLId from '~/utils/HTMLId';
import InputBase from '~/components/shared/form/InputBase';

type Props = {
  name: string;
  placeholder?: string;
  defaultValue?: any;
  size?: 'regular' | 'large';
  adornment?: React.ReactNode;
  onChange?: (value: any) => void;
  type?: 'text' | 'password' | 'number';
  input?:  React.RefObject<HTMLInputElement>;
} & React.ComponentProps<'input'>;

const TextField: React.FC<Props> = ({
  name,
  placeholder,
  defaultValue,
  onChange,
  adornment,
  className,
  readOnly,
  disabled,
  id,
  type = 'text',
  input
}) => {
  id = id || HTMLId();
  if (!adornment) {
    return (
      <InputBase
        name={name}
        id={id}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={onChange}
        // @ts-ignore
        type={type}
        className={className}
        readOnly={readOnly}
        disabled={disabled}
        input={input}
      />
    );
  }

  return (
    <>
      <div className="mt-1 relative rounded-md shadow-sm">
        <InputBase
          name={name}
          id={id}
          defaultValue={defaultValue}
          placeholder={placeholder}
          onChange={onChange}
          type="text"
          className={className}
          readOnly={readOnly}
          disabled={disabled}
          input={input}
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          {adornment}
        </div>
      </div>
    </>
  );
};

export default TextField;
