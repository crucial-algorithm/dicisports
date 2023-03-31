import { Role } from '@prisma/client';

import { useUser } from '~/hooks/useRootData';

export default function useIsOrganizer() {
  const user = useUser();

  return user && user.role === Role.ORGANIZER;
}
