/**
 * Decides which surface a request is for, from its host. Pure, so `proxy.ts`
 * stays a thin adapter and this logic is tested without a request.
 *
 * Traffic arrives through the Cloudflare Worker `vivah-router`, which forwards
 * the visitor's host in `X-Forwarded-Host` (the `Host` header is the Cloud Run
 * address). See `cloud/domain-routing.md`.
 *
 *   vivah.online                → the product site (form, preview, dashboard)
 *   raadha-shyam.vivah.online   → that couple's invite
 *   anything else               → the product site, unchanged
 *
 * "Anything else" covers the direct `*.run.app` URL and `localhost`, so the
 * app keeps working when nobody configured a root domain.
 */

import { isValidCoupleSlug } from '@/lib/couple-slug';

export type SiteSurface = { kind: 'main' } | { kind: 'invite'; slug: string };

/** Lowercases, and drops a port and a trailing dot: `Vivah.Online.:443` → `vivah.online`. */
export function normaliseHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

/**
 * The surface for a host.
 *
 * @param host The visitor's host: `X-Forwarded-Host`, or `Host` when absent.
 * @param rootDomain The product's root domain, e.g. `vivah.online`. Empty
 *   turns invite routing off: every host is the product site.
 */
export function resolveSiteSurface(host: string, rootDomain: string): SiteSurface {
  const root = normaliseHost(rootDomain);
  if (root === '') return { kind: 'main' };

  const visitor = normaliseHost(host);
  const suffix = `.${root}`;
  if (!visitor.endsWith(suffix)) return { kind: 'main' };

  const label = visitor.slice(0, -suffix.length);
  // `www.vivah.online` is the product site. The Worker redirects it to the
  // root, so this is only a fallback when somebody bypasses the Worker.
  if (label === 'www') return { kind: 'main' };
  // A deeper host (`a.b.vivah.online`) or a bad label is not a couple. It
  // still gets the invite surface, with an empty slug, so the visitor sees
  // "not found" rather than the product site under a couple's address.
  if (label.includes('.') || !isValidCoupleSlug(label)) return { kind: 'invite', slug: '' };
  return { kind: 'invite', slug: label };
}

/** The public URL of a couple's invite: `https://raadha-shyam.vivah.online`. */
export function inviteUrl(slug: string, rootDomain: string): string {
  return `https://${slug}.${normaliseHost(rootDomain)}`;
}

/**
 * Where to send a visitor for a couple's invite. With host routing on, the
 * couple's own subdomain. Without it (local development), the internal
 * `/site/<slug>` path, which renders the same page.
 */
export function inviteHref(slug: string, rootDomain: string): string {
  return rootDomain === '' ? `/site/${slug}` : inviteUrl(slug, rootDomain);
}

/** The part after a couple's slug, as the couple reads it: `vivah.online`. */
export function inviteDomainLabel(rootDomain: string): string {
  return rootDomain === '' ? 'vivah.online' : normaliseHost(rootDomain);
}

/** The address as the couple reads it: `raadha-shyam.vivah.online`. */
export function inviteHostLabel(slug: string, rootDomain: string): string {
  return `${slug}.${inviteDomainLabel(rootDomain)}`;
}

/**
 * The product's home page, as the "Made with ❤️ by vivah.online" credit on
 * every invite links to it. The `utm_*` tags let analytics count couples who
 * arrive from a guest's invite. Without host routing, the app's own URL.
 */
export function madeByUrl(rootDomain: string, appUrl: string): string {
  const home =
    rootDomain === '' ? appUrl.replace(/\/$/, '') : `https://${normaliseHost(rootDomain)}`;
  return `${home}/?utm_source=invite&utm_medium=footer`;
}
