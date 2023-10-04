import React, { forwardRef, useState } from 'react';
import type { FormProps } from '@remix-run/react';
import { Form, unstable_useBlocker, useBeforeUnload } from '@remix-run/react';
import { useTranslation } from 'react-i18next';

type Props = FormProps &
  React.RefAttributes<HTMLFormElement> & {
    readOnly?: boolean;
    isDirty?: boolean;
    setDirty?: () => void;
    blockNavigationWhenDirty?: boolean;
    alertMessage?: string;
    reset?: (f: () => void) => void;
  };

type UploadFormContextType = Props;

export const FormContext = React.createContext<UploadFormContextType>({});

const UploadForm: React.FC<Props> = forwardRef((props: Props, ref) => {
  const { t } = useTranslation('common');
  const { reset, alertMessage, action } = props;

  const [dirty, setDirty] = useState(false);

  reset && reset(() => setDirty(false));

  if (props.blockNavigationWhenDirty) {
    unstable_useBlocker((args) => {
      const currentPath = args.currentLocation.pathname;
      const nextPath = args.nextLocation.pathname;

      // Don't block if posting to the same URL
      if (!dirty || nextPath === (action ? action : currentPath)) {
        return false;
      }

      const confirmation = window.confirm(
        alertMessage
          ? alertMessage
          : t('Default Dirty Alert Message')
      );

      return !confirmation;
    });
  }

  // This will prevent user from leaving the page when closing the tab/browser or reloading page
  useBeforeUnload((e) => {
    if (dirty && props.blockNavigationWhenDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  const formProps = { ...props };

  delete formProps.blockNavigationWhenDirty;
  delete formProps.reset;

  return (
    <FormContext.Provider
      value={{ ...props, setDirty: () => setDirty(true) }}
    >
      <Form
        method="post"
        encType="multipart/form-data"
        {...formProps}
        ref={ref}
      >
        {props.children}
      </Form>
    </FormContext.Provider>
  );
});

// Fix lint forwardedRef displayName warning
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
