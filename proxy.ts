import { type NextRequest, NextResponse } from 'next/server';

import { isValidCoupleSlug } from '@/lib/couple-slug';
import { env } from '@/lib/env';
import { inviteUrl, resolveSiteSurface } from '@/lib/site-host';

/**
 * Host routing: one Next.js app serves the product site and every couple's
 * invite. `proxy.ts` is the Next.js 16 name for middleware.
 *
 *   raadha-shyam.vivah.online/        → rewrite to /site/raadha-shyam
 *   vivah.online/site/raadha-shyam    → redirect to raadha-shyam.vivah.online
 *   everything else                   → unchanged
 *
 * The visitor's host is in `X-Forwarded-Host`, set by the Cloudflare Worker.
 * `Host` is the Cloud Run address. See `cloud/domain-routing.md`.
 *
 * The invite pages live in the `app/(invite)` route group, which has no site
 * header or tab bar. That is decided by the route, not by `usePathname()` in a
 * client component, because a rewrite makes the client and server paths differ.
 */
export function proxy(request: NextRequest): NextResponse {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const surface = resolveSiteSurface(host, env.rootDomain);
  const { pathname } = request.nextUrl;

  if (surface.kind === 'invite') {
    // `_` is not a valid slug, so the invite page answers 404 without a read.
    const slug = surface.slug === '' ? '_' : surface.slug;
    const target = request.nextUrl.clone();
    target.pathname = `/site/${slug}${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(target);
  }

  // The product site never shows an invite under its own address: send the
  // visitor to the couple's real link. Only when routing is on.
  const siteMatch = /^\/site\/([^/]+)\/?$/.exec(pathname);
  const siteSlug = siteMatch?.[1];
  if (siteSlug !== undefined && isValidCoupleSlug(siteSlug) && env.rootDomain !== '') {
    return NextResponse.redirect(inviteUrl(siteSlug, env.rootDomain), 308);
  }

  return NextResponse.next();
}

export const config = {
  // Pages only: no API routes, no build assets, no files with an extension
  // (icons, fonts, robots.txt). Those are the same on every host.
  matcher: ['/((?!api/|_next/|.*\\.[a-zA-Z0-9]+$).*)'],
};
