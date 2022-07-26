import * as React from 'react';
import clsx from 'clsx';

type Props = {} & React.ComponentProps<'main'>

export default function Main({ className, children }: Props) {
  return (
    <main className={clsx(className, 'max-w-8xl m-auto px-5vw py-9')}>
      {children}
    </main>
  );
}
