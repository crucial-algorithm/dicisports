import { Role } from '@prisma/client';

import { useUser } from '~/hooks/useRootData';

export default function useIsAdmin() {
  const user = useUser();

  return user && user.role === Role.ADMIN;
}
