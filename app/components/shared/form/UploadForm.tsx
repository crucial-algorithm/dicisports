import React, { forwardRef, useState } from 'react';
import { Form, unstable_useBlocker } from '@remix-run/react';
import type { FormProps } from '@remix-run/react';
import { useTranslation } from 'react-i18next';

type Props = FormProps &
  React.RefAttributes<HTMLFormElement> & {
    readOnly?: boolean;
    isDirty?: boolean;
    setDirty?: () => void;
    blockNavigationWhenDirty?: boolean;
    alertMessage?: string;
  };

type UploadFormContextType = Props;

export const FormContext = React.createContext<UploadFormContextType>({});

const UploadForm: React.FC<Props> = forwardRef((props: Props, ref) => {
  const { t } = useTranslation('upload-form');
  const [isDirty, setDirty] = useState(false);

  if (props.blockNavigationWhenDirty) {
    unstable_useBlocker((args) => {
      const currentPath = args.currentLocation.pathname;
      const nextPath = args.nextLocation.pathname;

      if (!isDirty) {
        return false;
      }

      // If nextPath equals the current one, it means that the user is saving/publishing/removing(...)
      // So we return false to let the request run
      if (!isDirty || currentPath === nextPath) {
        return false;
      }

      const confirmation = window.confirm(
        props.alertMessage
          ? props.alertMessage
          : t('Default Dirty Alert Message')
      );

      // This will return false if user clicks "cancel"
      return !confirmation;
    });
  }

  return (
    <FormContext.Provider value={{ ...props, setDirty: () => setDirty(true) }}>
      <Form method="post" encType="multipart/form-data" {...props} ref={ref}>
        {props.children}
      </Form>
    </FormContext.Provider>
  );
});

// Fix lint error for forwardedRef displayName
UploadForm.displayName = 'UploadForm';

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
