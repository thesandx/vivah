import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { PREVIEW_COOKIE_NAME, previewCookie } from '@/lib/preview-cookie';
import { openPreviewLink } from '@/services/lead.service';

/**
 * `GET /p/<lead id>` — the link in the couple's WhatsApp message.
 *
 * A route handler, not a page, because the first visit must SET a cookie, and
 * a Server Component cannot. It binds the preview to this browser, then
 * redirects to `/preview/<id>`, which renders it. Every outcome redirects
 * there; the page reads the lead again and shows the right message (expired,
 * another phone, not found), so the messages live in one place.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Same rule as the session cookie: Secure everywhere except plain-HTTP localhost. */
function isSecureContext(): boolean {
  return !env.appUrl.startsWith('http://localhost') && !env.appUrl.startsWith('http://127.0.0.1');
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
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
