import type { LoaderFunction } from '@remix-run/node';

import type { SitemapEntry } from '~/types';
import { getDomainUrl } from '~/utils/misc';
import { findSports } from '~/server/db/reference.server';
import { findPublishedEvents } from '~/server/db/events.server';
import { getBlogPosts } from '~/utils/blog.server';

// keeping it easy for now... statically define "site" routes
const STATIC_ROUTES: SitemapEntry[] = [
  { priority: 1.0, changefreq: 'monthly', route: '/' },
  { priority: 0.1, changefreq: 'monthly', route: '/login' },
  { priority: 0.1, changefreq: 'monthly', route: '/signup' },
  { priority: 0.1, changefreq: 'monthly', route: '/recover' },
  { priority: 0.1, changefreq: 'monthly', route: '/privacy' }
];

export const loader: LoaderFunction = async ({ request }) => {
  const domainUrl = getDomainUrl(request).replace('www.', '');
  const sports = await findSports();
  const events = await findPublishedEvents();

  const entries: SitemapEntry[] = [...STATIC_ROUTES];

  for (const { id, updatedAt } of sports) {
    entries.push({
      priority: 1,
      changefreq: 'daily',
      route: `/?actionId=search&amp;sport=${id}`,
      lastmod: updatedAt.toISOString()
    });
  }

  // TODO: add list of supported languages
  for (const { slug, updatedAt } of events) {
    entries.push({
      priority: 1,
      changefreq: 'weekly',
      // Dicisports only supports portuguese for now
      route: `/pt/event/${slug}`,
      lastmod: updatedAt.toISOString()
    });
  }

  const posts = await getBlogPosts();

  posts.map(({ slug, date }) => {
    entries.push({ priority: 1, changefreq: 'weekly', route: `/blog/${slug}`, lastmod: date });
  });

  const sitemap = getSitemapXml(domainUrl, entries);

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Content-Length': String(Buffer.byteLength(sitemap))
    }
  });
};

function getSitemapXml(domainUrl: string, entries: SitemapEntry[]) {
  return `
<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"
>
  ${entries.map((entry) => toXml(entry, domainUrl)).join('\n')}
</urlset>
  `.trim();
}

function toXml({ route, lastmod, changefreq, priority }: SitemapEntry, domainUrl: string) {
  return `
<url>
  <loc>${domainUrl}${route}</loc>
  ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
  ${changefreq ? `<changefreq>${changefreq}</changefreq>` : ''}
  ${priority ? `<priority>${priority}</priority>` : ''}
</url>
  `.trim();
}
