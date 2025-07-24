import type { LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';

export const loader: LoaderFunction = async ({ params }) => {
  const { findEventSeriesBySlug } = await import('~/server/db/event-series.server');
  
  const slug = params.slug as string;
  const edition = params.edition as string;

  if (!slug || !edition) {
    throw new Response('Not found', { status: 404 });
  }

  const series = await findEventSeriesBySlug(slug);

  if (!series) {
    throw new Response('Series not found', { status: 404 });
  }

  // Find the event with the matching edition
  const event = series.events.find((e: any) => e.edition === edition);

  if (!event) {
    throw new Response('Edition not found', { status: 404 });
  }

  // Redirect to the actual event page
  return redirect(`/event/${event.slug}`);
};

// This route only handles redirects, so no default export is needed
export default function SeriesEditionRoute() {
  return null;
}
