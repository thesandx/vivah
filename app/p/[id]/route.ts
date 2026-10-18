import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { LINK_PREVIEW_HEADERS, linkPreviewHtml } from '@/lib/link-preview-page';
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
  const html = linkPreviewHtml({
    title: 'Your wedding invite preview',
    description: 'Open your invite and see it exactly as your guests will.',
    url: `${origin}/p/${encodeURIComponent(id)}`,
    siteName: env.appName,
    image: { ...SHARE_IMAGE, url: `${origin}${SHARE_IMAGE.url}` },
  });
  return new NextResponse(html, { status: 200, headers: LINK_PREVIEW_HEADERS });
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
