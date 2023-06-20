import React from 'react';

type Props = {
  list: Array<unknown>;
} & React.ComponentProps<'div'>;

export default function WhenListEmpty({ children, list }: Props) {
  if (list.length > 0) {
    return null;
  }
  return <>{children}</>;
}
