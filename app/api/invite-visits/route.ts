import { NextResponse } from 'next/server';

import { ADMIN_COOKIE_NAME } from '@/lib/admin-cookie';
import { inviteBeaconSchema } from '@/lib/invite-tracking';
import { logger } from '@/lib/logger';
import { clientIp, RateLimiter } from '@/lib/rate-limit';
import { recordInviteBeacon } from '@/services/invite-beacon.service';

/**
 * `POST /api/invite-visits` — a couple's live invite reports a visit. NO
 * SESSION, on purpose: guests never sign in. ADR-0020 records the decision.
 * Its limits match `POST /api/preview-visits` (ADR-0019):
 *
 *   - It creates one `inviteBeacons` document and nothing else. It reads
 *     nothing back, not even the wedding, and answers 204 with no body.
 *   - The body is a strict zod schema (`lib/invite-tracking.ts`). Every
 *     value is a fixed id, a flag or a hash id, so no free text is stored.
 *   - The body is at most 1 KB, and each visitor may send 60 beacons in 10
 *     minutes.
 *   - A crawler, a link preview or a headless browser is answered and not
 *     stored. A request with the admin cookie is answered and not stored
 *     either. On a couple's own address the admin cookie is not sent, so the
 *     page itself also stays quiet in the admin's browser.
 *   - The IP address is used only for the rate limit. It is not stored or
 *     logged.
 *
 * A made-up wedding id stores a beacon that no invite reads.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 1024;

/** A busy guest sends a few beacons a visit; a family on one Wi-Fi shares an IP. */
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
  const parsed = inviteBeaconSchema.safeParse(raw);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  try {
    await recordInviteBeacon(parsed.data);
  } catch (error) {
    // A lost beacon loses one count and nothing else.
    logger.error('Storing an invite beacon failed', error);
    return new NextResponse(null, { status: 503 });
  }
  return new NextResponse(null, { status: 204 });
}
