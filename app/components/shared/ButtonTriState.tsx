import clsx from 'clsx';
import {
  Button as PrimeReactButton,
  type ButtonProps
} from 'primereact/button';

import { XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import type { ReactNode } from 'react';

export default function ButtonTriState({
  labels,
  icons,
  selectionState,
  className,
  'data-cy': dataCy,
  onChange,
  ...restButtonProps
}: ButtonTristateProps) {
  const klass = clsx(
    'ds ds-button-tristate',
    className,
    { include: selectionState === true, exclude: selectionState === false }
  );

  const StateIcon = stateToIcon(selectionState, icons || defaultIconSet);
  const label = stateToLabel(selectionState, labels);

  return (
    <PrimeReactButton
      className={klass}
      label={label}
      data-cy={dataCy}
      {...restButtonProps}
      icon={StateIcon}
      type="button"
      onClick={handleSelectionStateChange}
    />
  );

  function handleSelectionStateChange() {
    let newValue: boolean | null | undefined = true;

    if (selectionState === true) {
      newValue = false;
    } else if (selectionState === false) {
      newValue = null;
    } else {
      newValue = true;
    }

    onChange(newValue);
  }
}

const defaultIconSet: ButtonTristateIcon = {
    checked: <CheckIcon className="h-6" />,
    unchecked: <XMarkIcon className="h-6" />,
    indeterminate: null
};

function stateToIcon(
  selectionState: true | false | null | undefined,
  icons: ButtonTristateIcon
) {
  let icon: ReactNode | null = icons.indeterminate;

  if (selectionState === true) {
    icon = icons.checked;
  } else if (selectionState === false) {
    icon = icons.unchecked;
  } else {
    icon = icons.indeterminate;
  }

  return icon;
}


function stateToLabel(
  selectionState: true | false | null | undefined,
  { checked, unchecked, indeterminate }: ButtonTristateLabel
) {
  let label: string;

  if (selectionState === true) {
    label = checked;
  } else if (selectionState === false) {
    label = unchecked;
  } else {
    label = indeterminate
  }

  return label;
}

type ButtonTristateLabel = {
  checked: string;
  unchecked: string;
  indeterminate: string;
};

type ButtonTristateIcon = {
  checked: ReactNode;
  unchecked: ReactNode;
  indeterminate: ReactNode | null;
};

export type ButtonTristateProps = Omit<
  ButtonProps,
  'icon' | 'onClick' | 'onChange' | 'label'
> & {
  labels: ButtonTristateLabel;
  icons?: ButtonTristateIcon
  selectionState?: true | false | null | undefined;
  'data-cy'?: string;
  onChange: (newSelectionState: true | false | null | undefined) => void;
};
