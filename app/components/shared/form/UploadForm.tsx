import React, { forwardRef, useState } from 'react';
import { Form } from '@remix-run/react';
import type { FormProps } from '@remix-run/react';

type Props = FormProps &
  React.RefAttributes<HTMLFormElement> & { readOnly?: boolean, isDirty?: boolean, setDirty?: () => void };

type UploadFormContextType = Props;

export const FormContext = React.createContext<UploadFormContextType>({});

const UploadForm: React.FC<Props> = forwardRef((props: Props, ref) => {
  const [isDirty, setDirty] = useState(false);

  return (
    <FormContext.Provider
      value={{ ...props, setDirty: () => setDirty(true) }}
    >
      <Form
        method="post"
        encType="multipart/form-data"
        {...props}
        // @ts-ignore
        data={JSON.stringify({ _isDirty: isDirty })}
        ref={ref}
      >
        {props.children}
      </Form>
    </FormContext.Provider>
  );
});

type FetcherFormProps = {
  readOnly?: boolean;
  method: string;
  form: React.ForwardRefExoticComponent<
    FormProps & React.RefAttributes<HTMLFormElement>
  >;
} & FormProps &
  React.RefAttributes<HTMLFormElement>;

export function FetcherForm(props: FetcherFormProps) {
  const { form } = props;
  const TheForm = form;

  return (
    <FormContext.Provider value={props}>
      <TheForm {...props}>{props.children}</TheForm>
    </FormContext.Provider>
  );
}

export default UploadForm;
