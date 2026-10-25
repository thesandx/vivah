/**
 * The link preview for a couple's invite: the title, the description and the
 * image that WhatsApp shows when a guest's link is shared. Pure, so it is
 * tested without a request.
 *
 * WhatsApp reads Open Graph tags. It needs an absolute `og:image` at least
 * 300 px wide and under about 300 KB, or it falls back to a small thumbnail.
 * The image is a 4:5 portrait card: WhatsApp shows a tall image as a tall
 * card, at its real size. It is drawn by `app/api/og/[slug]/route.tsx`.
 */

import type { Metadata } from 'next';

import { coupleNames, type NameOrder, orderedNames } from '@/lib/couple-names';
import { encodeGuestSegment, guestPath } from '@/lib/guest-name';
import type { LinkPreviewCard } from '@/lib/link-preview-page';
import { inviteUrl } from '@/lib/site-host';
import { formatShortWeddingDate, formatWeddingDate } from '@/lib/wedding-date';

export const OG_IMAGE_WIDTH = 1080;
export const OG_IMAGE_HEIGHT = 1350;

export interface InviteMetaInput {
  slug: string;
  bride: string;
  groom: string;
  /** Whose name comes first. Absent: the bride's. */
  nameOrder?: NameOrder | undefined;
  weddingDate: string | null;
  /** The parsed guest name, or `null` for the couple's plain link. */
  guestName: string | null;
  /**
   * The guest's path segment as shared, such as `Rahul-2` for a second Rahul.
   * The page's own URL keeps it. Omit to derive it from `guestName`.
   */
  guestSegment?: string;
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

/** The preview image for a guest: `<origin>/api/og/sara?guest=Neha`. */
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

/**
 * `Radha & Shyam's Wedding Invitation | 9 March`. The names come in the
 * couple's order: `orderedNames` gives them.
 */
export function inviteTitle(first: string, second: string, weddingDate: string | null): string {
  const base = `${first} & ${second}'s Wedding Invitation`;
  return weddingDate === null ? base : `${base} | ${formatShortWeddingDate(weddingDate)}`;
}

/** `Hi Neha, you are invited to the wedding of Radha and Shyam on …`. */
export function inviteDescription(
  first: string,
  second: string,
  weddingDate: string | null,
  guestName: string | null,
): string {
  const greeting = guestName === null ? 'You are' : `Hi ${guestName}, you are`;
  const day = weddingDate === null ? '' : ` on ${formatWeddingDate(weddingDate)}`;
  return `${greeting} invited to the wedding of ${first} and ${second}${day}.`;
}

/** The card a link-preview fetcher sees for an invite. */
export function inviteCard(input: InviteMetaInput): LinkPreviewCard {
  const origin = inviteOrigin(input.slug, input.rootDomain, input.appUrl);
  const url =
    input.guestName === null
      ? origin
      : input.guestSegment === undefined
        ? `${origin}${guestPath(input.guestName)}`
        : `${origin}/${encodeGuestSegment(input.guestSegment)}`;
  const [first, second] = orderedNames(input);
  return {
    title: inviteTitle(first, second, input.weddingDate),
    description: inviteDescription(first, second, input.weddingDate, input.guestName),
    url,
    siteName: 'vivah.online',
    image: {
      url: ogImageUrl(input),
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      alt: `Wedding invitation of ${coupleNames(input, 'and')}`,
    },
  };
}

/**
 * The page metadata for an invite. A guest's page is not indexed: it is a
 * private greeting, and indexing every name a couple typed adds nothing.
 */
export function inviteMetadata(input: InviteMetaInput): Metadata {
  const { title, description, url, siteName, image } = inviteCard(input);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName,
      url,
      title,
      description,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
    ...(input.guestName !== null && { robots: { index: false, follow: false } }),
  };
}
