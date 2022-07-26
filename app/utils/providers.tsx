import { useMatches } from '@remix-run/react';

import type { KCDHandle } from '~/types';

function useMatchLoaderData<LoaderData>(handleId: string) {
  const matches = useMatches();
  const match = matches.find(
    ({ handle }) => (handle as KCDHandle | undefined)?.id === handleId
  );

  if (!match) {
    throw new Error(`No active route has a handle ID of ${handleId}`);
  }
  return match.data as LoaderData;
}

function useOptionalMatchLoaderData<LoaderData>(handleId: string) {
  const matches = useMatches();

  return matches.find(
    ({ handle }) => (handle as KCDHandle | undefined)?.id === handleId
  )?.data as LoaderData | undefined;
}

export { useMatchLoaderData, useOptionalMatchLoaderData };
