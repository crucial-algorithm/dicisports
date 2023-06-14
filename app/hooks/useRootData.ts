// this is needed by things the root needs, so to avoid circular deps we have to
// put it in its own file which is silly I know...

import type { RootLoaderData } from '~/root';
import { useMatchLoaderData } from '~/utils/providers';


export const useRootData = () => useMatchLoaderData<RootLoaderData>('root');

export function useUser() {
  return useRootData().user;
}
