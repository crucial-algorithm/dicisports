// this is needed by things the root needs, so to avoid circular deps we have to
// put it in its own file which is silly I know...

import type { RootLoaderData } from '~/root';

import { useMatchLoaderData } from './providers';

export const useRootData = () => useMatchLoaderData<RootLoaderData>('root');

export function useUser() {
  const { user } = useRootData();

  if (!user) {throw new Error('User is required when using useUser');}
  return user;
}
