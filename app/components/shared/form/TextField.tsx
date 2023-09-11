import React, { useContext } from 'react';

import InputBase from '~/components/shared/form/InputBase';
import { FormContext } from '~/components/shared/form/UploadForm';

type Props = {
  name: string;
  placeholder?: string;
  defaultValue?: any;
  size?: 'regular' | 'large';
  adornment?: React.ReactNode;
  onChange?: (value: any) => void;
  type?: 'text' | 'password' | 'number';
  input?: React.RefObject<HTMLInputElement>;
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
  input,
  autoComplete,
  onClick,
  step
}) => {
  id = id || '';
  const formProps = useContext(FormContext);

  defaultValue = defaultValue === null ? undefined : defaultValue;

  if (formProps.readOnly) {
    return (<div className="font-medium dark:text-white">{defaultValue}</div>);
  }

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
        step={step}
        autoComplete={autoComplete}
        onClick={onClick}
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
          autoComplete={autoComplete}
          onClick={onClick}
        />
        <div className="absolute inset-y-0 right-1 flex items-center">
          {adornment}
        </div>
      </div>
    </>
  );
};

export default TextField;
