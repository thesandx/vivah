/**
 * The small page a link-preview fetcher reads instead of the real one.
 *
 * WhatsApp builds a link preview on the sender's phone and reads only the
 * start of the HTML. Our pages put the inlined stylesheet (~75 KB, see
 * `inlineCss` in `next.config.ts`) in `<head>` before the Open Graph tags, so
 * on Android WhatsApp never reaches `og:image` and shows a bare link. This
 * page holds the tags and nothing else. Pure, so it is tested without a request.
 */

export interface LinkPreviewCard {
  title: string;
  description: string;
  /** The absolute URL of the page the card stands for. */
  url: string;
  siteName: string;
  image: { url: string; width: number; height: number; alt: string };
}

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapes text for an HTML attribute or element. Couple and guest names are user input. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ENTITIES[character] ?? character);
}

/** The whole page: `<head>` with the Open Graph and Twitter tags, an empty body. */
export function linkPreviewHtml(card: LinkPreviewCard): string {
  const meta = (attribute: 'name' | 'property', key: string, value: string | number): string =>
    `<meta ${attribute}="${key}" content="${escapeHtml(String(value))}">`;
  return [
    '<!doctype html>',
    '<html lang="en"><head><meta charset="utf-8">',
    `<title>${escapeHtml(card.title)}</title>`,
    meta('name', 'description', card.description),
    meta('name', 'robots', 'noindex, nofollow'),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', card.siteName),
    meta('property', 'og:url', card.url),
    meta('property', 'og:title', card.title),
    meta('property', 'og:description', card.description),
    meta('property', 'og:image', card.image.url),
    meta('property', 'og:image:width', card.image.width),
    meta('property', 'og:image:height', card.image.height),
    meta('property', 'og:image:alt', card.image.alt),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:image', card.image.url),
    '</head><body></body></html>',
  ].join('\n');
}

/** Response headers for the page: never cached, never indexed. */
export const LINK_PREVIEW_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;
