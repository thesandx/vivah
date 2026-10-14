import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';
import { sitemapEntries, siteOrigin } from '@/lib/seo';

/**
 * `GET /sitemap.xml`: the marketing pages only. No couple's invite, preview
 * or signed-in page is listed. Add a page to `MARKETING_PAGES` in
 * `lib/seo.ts` when it should be found in search.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(siteOrigin(env.rootDomain, env.appUrl));
}
