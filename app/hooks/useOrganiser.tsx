import type { OrganiserLoaderData } from '~/routes/o';
import { useMatchLoaderData } from '~/utils/providers';

const useOrganiserLoaderData = () => useMatchLoaderData<OrganiserLoaderData>('organiser');

export function useOrganiser() {
  return useOrganiserLoaderData().organiser;
}
