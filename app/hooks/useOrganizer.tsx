import type { OrganizerLoaderData } from '~/routes/o';
import { useMatchLoaderData } from '~/utils/providers';

const useOrganizerLoaderData = () => useMatchLoaderData<OrganizerLoaderData>('organizer');

export function useOrganizer() {
  return useOrganizerLoaderData().organizer;
}
