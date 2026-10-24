import { type NextRequest, NextResponse } from 'next/server';

import { isValidCoupleSlug } from '@/lib/couple-slug';
import { env } from '@/lib/env';
import { isOldSampleSlug, SAMPLE_SLUG } from '@/lib/sample-invite';
import { isLinkPreviewAgent } from '@/lib/seo';
import { inviteUrl, normaliseHost, resolveSiteSurface } from '@/lib/site-host';

/**
 * Host routing: one Next.js app serves the product site and every couple's
 * invite. `proxy.ts` is the Next.js 16 name for middleware.
 *
 *   raadha-shyam.vivah.online/          → rewrite to /site/raadha-shyam
 *   raadha-shyam.vivah.online/Neha  → rewrite to /site/raadha-shyam/Neha
 *   the same, from WhatsApp's fetcher   → rewrite to /api/share/raadha-shyam/Neha
 *   vivah.online/site/raadha-shyam      → redirect to raadha-shyam.vivah.online
 *   vivah.online/site/raadha-shyam/K    → redirect to raadha-shyam.vivah.online/K
 *   riya-arjun.vivah.online/K           → redirect to the sample's current address
 *   everything else                   → unchanged
 *
 * The visitor's host is in `X-Forwarded-Host`, set by the Cloudflare Worker.
 * `Host` is the Cloud Run address. See `cloud/domain-routing.md`.
 *
 * The sample invite is the one page another page may frame: the home page
 * shows it, live, inside a phone. `next.config.ts` leaves its
 * `X-Frame-Options: DENY` off, and this file sends `frame-ancestors` in its
 * place, naming the product site only.
 *
 * The invite pages live in the `app/(invite)` route group, which has no site
 * header. That is decided by the route, not by `usePathname()` in a
 * client component, because a rewrite makes the client and server paths differ.
 */
export function proxy(request: NextRequest): NextResponse {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const surface = resolveSiteSurface(host, env.rootDomain);
  const { pathname } = request.nextUrl;

  if (surface.kind === 'invite' && isOldSampleSlug(surface.slug)) {
    return NextResponse.redirect(
      `${inviteUrl(SAMPLE_SLUG, env.rootDomain)}${pathname === '/' ? '' : pathname}`,
      308,
    );
  }

  if (surface.kind === 'invite') {
    // `_` is not a valid slug, so the invite page answers 404 without a read.
    const slug = surface.slug === '' ? '_' : surface.slug;
    const target = request.nextUrl.clone();
    // WhatsApp and Facebook get the small link-preview page instead: the real
    // page's Open Graph tags sit too far down for WhatsApp on Android to read.
    const base = isLinkPreviewAgent(request.headers.get('user-agent')) ? '/api/share' : '/site';
    target.pathname = `${base}/${slug}${pathname === '/' ? '' : pathname}`;
    const response = NextResponse.rewrite(target);
    if (slug === SAMPLE_SLUG) {
      response.headers.set(
        'Content-Security-Policy',
        `frame-ancestors 'self' https://${normaliseHost(env.rootDomain)}`,
      );
    }
    return response;
  }

  // The product site never shows an invite under its own address: send the
  // visitor to the couple's real link. Only when routing is on.
  // A guest's link keeps its name segment, still encoded.
  const siteMatch = /^\/site\/([^/]+)(\/[^/]+)?\/?$/.exec(pathname);
  const siteSlug = siteMatch?.[1];
  if (siteSlug !== undefined && isValidCoupleSlug(siteSlug) && env.rootDomain !== '') {
    return NextResponse.redirect(
      `${inviteUrl(siteSlug, env.rootDomain)}${siteMatch?.[2] ?? ''}`,
      308,
    );
  }

  const response = NextResponse.next();
  // Without host routing (local development), the home page frames the
  // sample at its internal path, on the same origin.
  if (siteSlug === SAMPLE_SLUG) {
    response.headers.set('Content-Security-Policy', "frame-ancestors 'self'");
  }
  return response;
}

export const config = {
  // Pages only: no API routes, no build assets, no files with an extension
  // (icons, fonts, robots.txt). Those are the same on every host.
  matcher: ['/((?!api/|_next/|.*\\.[a-zA-Z0-9]+$).*)'],
};
