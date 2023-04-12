import React from 'react';
import { Form } from '@remix-run/react';
import type { FormProps } from '@remix-run/react';

type Props = FormProps &
  React.RefAttributes<HTMLFormElement> & { readOnly?: boolean };

type UploadFormContextType = Props;

export const UploadFormContext = React.createContext<UploadFormContextType>({});

const UploadForm: React.FC<Props> = (props: Props) => {
  return (
    <UploadFormContext.Provider value={props}>
      <Form method="post" encType="multipart/form-data" {...props}>
        {props.children}
      </Form>
    </UploadFormContext.Provider>
  );
};

export default UploadForm;
