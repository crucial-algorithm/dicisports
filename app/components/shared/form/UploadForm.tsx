import React from 'react';
import { Form } from '@remix-run/react';
import type { FormProps } from '@remix-run/react';

type Props = FormProps &
  React.RefAttributes<HTMLFormElement> & { readOnly?: boolean };

type UploadFormContextType = Props;

export const FormContext = React.createContext<UploadFormContextType>({});

const UploadForm: React.FC<Props> = (props: Props) => {
  return (
    <FormContext.Provider value={props}>
      <Form method="post" encType="multipart/form-data" {...props}>
        {props.children}
      </Form>
    </FormContext.Provider>
  );
};

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
