import { NextResponse } from 'next/server';

import { ADMIN_COOKIE_NAME } from '@/lib/admin-cookie';
import { logger } from '@/lib/logger';
import { previewBeaconSchema } from '@/lib/preview-tracking';
import { clientIp, RateLimiter } from '@/lib/rate-limit';
import { recordPreviewBeacon } from '@/services/preview-beacon.service';

/**
 * `POST /api/preview-visits` — the preview page reports how a view went. NO
 * SESSION, on purpose: the couple has no account until they pay. ADR-0019
 * records the decision and its limits, which follow `POST /api/visits`
 * (ADR-0014):
 *
 *   - It creates one `previewBeacons` document and nothing else. It reads
 *     nothing back, not even the preview, and answers 204 with no body.
 *   - The body is a strict zod schema (`lib/preview-tracking.ts`). Every
 *     value is a fixed id or a bounded number, so no free text is stored.
 *   - The body is at most 4 KB, and each visitor may send 60 beacons in 10
 *     minutes.
 *   - A crawler, a link preview or a headless browser is answered and not
 *     stored. A browser with the admin cookie is answered and not stored
 *     either, so the admin's own checks do not count as the couple's.
 *   - The IP address is used only for the rate limit. It is not stored or
 *     logged.
 *
 * A made-up preview id stores a beacon that no preview reads: the report
 * starts from the leads, so it counts nothing.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4096;

/** A real view sends a few beacons a minute at most. */
const limiter = new RateLimiter({ limit: 60, windowMs: 10 * 60_000 });

/** User agents that are not a person reading the page. */
const ROBOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview/i;

/** True when the request carries the admin's cookie. Its value is not checked: nothing is granted. */
function fromAdmin(request: Request): boolean {
  const cookie = request.headers.get('cookie') ?? '';
  return cookie.split(';').some((part) => part.trim().startsWith(`${ADMIN_COOKIE_NAME}=`));
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!limiter.hit(clientIp(request.headers)).allowed) {
    return new NextResponse(null, { status: 429 });
  }
  if (ROBOT.test(request.headers.get('user-agent') ?? '') || fromAdmin(request)) {
    return new NextResponse(null, { status: 204 });
  }

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const parsed = previewBeaconSchema.safeParse(raw);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  try {
    await recordPreviewBeacon(parsed.data);
  } catch (error) {
    // A lost beacon loses a little measurement and nothing else.
    logger.error('Storing a preview beacon failed', error);
    return new NextResponse(null, { status: 503 });
  }
  return new NextResponse(null, { status: 204 });
}
