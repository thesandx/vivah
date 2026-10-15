/**
 * The link preview for a couple's invite: the title, the description and the
 * image that WhatsApp shows when a guest's link is shared. Pure, so it is
 * tested without a request.
 *
 * WhatsApp reads Open Graph tags. A large image card needs an absolute
 * `og:image` of at least 300 px wide; 1200 × 630 is the size every app crops
 * well. The image itself is drawn by `app/api/og/[slug]/route.tsx`.
 */

import type { Metadata } from 'next';

import { guestPath } from '@/lib/guest-name';
import { inviteUrl } from '@/lib/site-host';
import { formatShortWeddingDate, formatWeddingDate } from '@/lib/wedding-date';

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export interface InviteMetaInput {
  slug: string;
  bride: string;
  groom: string;
  weddingDate: string | null;
  /** The parsed guest name, or `null` for the couple's plain link. */
  guestName: string | null;
  /** The product's root domain; empty when host routing is off. */
  rootDomain: string;
  /** The app's own URL, used when host routing is off. */
  appUrl: string;
}

/**
 * Where the couple's invite lives: `https://sara.vivah.online`, or the
 * internal `/site/sara` under the app's URL when host routing is off.
 */
export function inviteOrigin(slug: string, rootDomain: string, appUrl: string): string {
  return rootDomain === ''
    ? `${appUrl.replace(/\/$/, '')}/site/${slug}`
    : inviteUrl(slug, rootDomain);
}

/** The preview image for a guest: `<origin>/api/og/sara?guest=Kartheek`. */
export function ogImageUrl(input: InviteMetaInput): string {
  // The API route is outside the host rewrite, so it answers on every host.
  // Behind routing it uses the couple's host; without it, the app's URL.
  const host =
    input.rootDomain === ''
      ? input.appUrl.replace(/\/$/, '')
      : inviteUrl(input.slug, input.rootDomain);
  const query = input.guestName === null ? '' : `?guest=${encodeURIComponent(input.guestName)}`;
  return `${host}/api/og/${input.slug}${query}`;
}

/** `Radha & Shyam's Wedding Invitation | 9 March`. */
export function inviteTitle(bride: string, groom: string, weddingDate: string | null): string {
  const base = `${bride} & ${groom}'s Wedding Invitation`;
  return weddingDate === null ? base : `${base} | ${formatShortWeddingDate(weddingDate)}`;
}

/** `Hi Kartheek, you are invited to the wedding of Radha and Shyam on …`. */
export function inviteDescription(
  bride: string,
  groom: string,
  weddingDate: string | null,
  guestName: string | null,
): string {
  const greeting = guestName === null ? 'You are' : `Hi ${guestName}, you are`;
  const day = weddingDate === null ? '' : ` on ${formatWeddingDate(weddingDate)}`;
  return `${greeting} invited to the wedding of ${bride} and ${groom}${day}.`;
}

/**
 * The page metadata for an invite. A guest's page is not indexed: it is a
 * private greeting, and indexing every name a couple typed adds nothing.
 */
export function inviteMetadata(input: InviteMetaInput): Metadata {
  const title = inviteTitle(input.bride, input.groom, input.weddingDate);
  const description = inviteDescription(
    input.bride,
    input.groom,
    input.weddingDate,
    input.guestName,
  );
  const origin = inviteOrigin(input.slug, input.rootDomain, input.appUrl);
  const url = input.guestName === null ? origin : `${origin}${guestPath(input.guestName)}`;
  const image = {
    url: ogImageUrl(input),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: `Wedding invitation of ${input.bride} and ${input.groom}`,
  };

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: 'vivah.online',
      url,
      title,
      description,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
    ...(input.guestName !== null && { robots: { index: false, follow: false } }),
  };
}
