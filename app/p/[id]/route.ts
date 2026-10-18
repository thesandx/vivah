import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { PREVIEW_COOKIE_NAME, previewCookie } from '@/lib/preview-cookie';
import { isLinkPreviewAgent, SHARE_IMAGE, siteOrigin } from '@/lib/seo';
import { openPreviewLink } from '@/services/lead.service';

/**
 * `GET /p/<lead id>` — the link in the couple's WhatsApp message.
 *
 * A route handler, not a page, because the first visit must SET a cookie, and
 * a Server Component cannot. It binds the preview to this browser, then
 * redirects to `/preview/<id>`, which renders it. Every outcome redirects
 * there; the page reads the lead again and shows the right message (expired,
 * another phone, not found), so the messages live in one place.
 *
 * A link-preview fetcher (WhatsApp builds the preview on the SENDER's phone
 * while the message is typed) gets a small page with the share card instead.
 * It must not open the link: that would start the 30 minutes and take one of
 * the two browser slots before the couple ever taps it.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Same rule as the session cookie: Secure everywhere except plain-HTTP localhost. */
function isSecureContext(): boolean {
  return !env.appUrl.startsWith('http://localhost') && !env.appUrl.startsWith('http://127.0.0.1');
}

/** The page a link-preview fetcher reads. Fixed text: nothing about the lead. */
function linkPreviewPage(id: string): NextResponse {
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  const title = 'Your wedding invite preview';
  const description = 'Open your invite and see it exactly as your guests will.';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="robots" content="noindex, nofollow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${env.appName}">
<meta property="og:url" content="${origin}/p/${encodeURIComponent(id)}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${origin}${SHARE_IMAGE.url}">
<meta property="og:image:width" content="${SHARE_IMAGE.width}">
<meta property="og:image:height" content="${SHARE_IMAGE.height}">
<meta property="og:image:alt" content="${SHARE_IMAGE.alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${origin}${SHARE_IMAGE.url}">
</head><body></body></html>`;
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  if (isLinkPreviewAgent(request.headers.get('user-agent'))) return linkPreviewPage(id);

  // A relative Location, on purpose. Behind the Cloudflare Worker,
  // `request.url` is the container's own address (http://0.0.0.0:8080), so an
  // absolute URL built from it sends the visitor somewhere they cannot reach.
  // The browser resolves a relative Location against the address it used.
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: `/preview/${encodeURIComponent(id)}` },
  });

  try {
    const store = await cookies();
    const { newToken } = await openPreviewLink(id, store.get(PREVIEW_COOKIE_NAME)?.value);
    if (newToken !== null) {
      response.cookies.set(previewCookie(id, newToken, isSecureContext()));
      logger.info('Preview opened for the first time', { leadId: id });
    }
  } catch (error) {
    // The page will try the read again and show an error state if it fails.
    logger.error('Opening a preview link failed', error, { leadId: id });
  }

  return response;
}
