import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

import { env } from '@/lib/env';
import { robotsFor, siteOrigin } from '@/lib/seo';

/**
 * `GET /robots.txt`, per host. The product site invites search and AI
 * crawlers; a couple's invite turns them away, because guests' names are in
 * its paths. The rules are in `lib/seo.ts`.
 *
 * `proxy.ts` does not rewrite this path (it has a file extension), so the
 * request's own host decides. The Worker sends it in `X-Forwarded-Host`.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? '';
  return robotsFor(host, env.rootDomain, siteOrigin(env.rootDomain, env.appUrl));
}
