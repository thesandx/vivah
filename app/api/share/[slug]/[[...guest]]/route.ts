import { coupleInviteCard } from '@/app/(invite)/site/[slug]/couple-invite';
import { LINK_PREVIEW_HEADERS, linkPreviewHtml } from '@/lib/link-preview-page';
import { logger } from '@/lib/logger';

/**
 * `GET /api/share/<slug>/<guest>` — the invite as a link-preview fetcher sees
 * it. `proxy.ts` rewrites a WhatsApp or Facebook request for
 * `sara.vivah.online/Neha` here, so the fetcher gets the Open Graph tags
 * at the very top of a small page. The real page carries ~75 KB of inlined
 * CSS before them, which WhatsApp on Android does not read past. See
 * `lib/link-preview-page.ts`.
 *
 * It reads the same wedding and guest link as the page, so a deleted guest
 * link or a paused invite gets the same answer as on the page.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; guest?: string[] }> },
): Promise<Response> {
  const { slug, guest = [] } = await params;
  const notFound = new Response('Not found', { status: 404, headers: LINK_PREVIEW_HEADERS });
  // An invite has one guest segment at most. Anything deeper is not a page.
  if (guest.length > 1) return notFound;

  try {
    const card = await coupleInviteCard(slug, guest[0] ?? null);
    if (card === null) return notFound;
    return new Response(linkPreviewHtml(card), { status: 200, headers: LINK_PREVIEW_HEADERS });
  } catch (error) {
    logger.error('Building an invite link preview failed', error, { slug });
    return new Response('Unavailable', { status: 503, headers: LINK_PREVIEW_HEADERS });
  }
}
