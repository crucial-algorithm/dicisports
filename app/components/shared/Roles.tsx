import type { ReactElement } from 'react';
import * as React from 'react';

import { useIsAdmin, useIsOrganizer, useUser } from '~/hooks';

type RoleProps = { children: ReactElement<any, any> | ReactElement<any, any>[] | string };

function IsAdmin({ children }: RoleProps) {
  const is = useIsAdmin();

  return is ? <>{children}</> : null;
}

function IsOrganizer({ children }: RoleProps) {
  const is = useIsOrganizer();

  return is ? <>{children}</> : null;
}

function IsNotAnOrganizer({ children }: RoleProps) {
  const is = useIsOrganizer();

  return !is ? <>{children}</> : null;
}

function IsUserAuthenticated({ children }: RoleProps) {
  const is = !!useUser();

  return is ? <>{children}</> : null;
}

function IsUserUnAuthenticated({ children }: RoleProps) {
  const is = !useUser();

  return is ? <>{children}</> : null;
}

export { IsAdmin, IsOrganizer, IsNotAnOrganizer, IsUserAuthenticated, IsUserUnAuthenticated };
