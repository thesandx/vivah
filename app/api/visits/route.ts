import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { clientIp, RateLimiter } from '@/lib/rate-limit';
import { visitBeaconSchema } from '@/lib/visit-tracking';
import { recordVisitBeacon } from '@/services/visit.service';

/**
 * `POST /api/visits` — the home page reports how a visit went. NO SESSION, on
 * purpose: most visitors never sign in. ADR-0014 records the decision and its
 * limits:
 *
 *   - It creates one `visitBeacons` document and nothing else. It reads
 *     nothing back and answers 204 with no body.
 *   - The body is a strict zod schema (`lib/visit-tracking.ts`). Every value
 *     is a fixed id or a bounded number, so no free text is stored.
 *   - The body is at most 4 KB, and each visitor may send 60 beacons in 10
 *     minutes.
 *   - A crawler or a headless browser is answered and not stored, so the
 *     report counts people.
 *   - The IP address is used only for the rate limit. It is not stored or
 *     logged.
 *
 * The browser sends it with `navigator.sendBeacon`, which does not wait for
 * or read the answer.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4096;

/** A real visit sends a few beacons a minute at most. */
const limiter = new RateLimiter({ limit: 60, windowMs: 10 * 60_000 });

/** User agents that are not a person reading the page. */
const ROBOT = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview/i;

export async function POST(request: Request): Promise<NextResponse> {
  if (!limiter.hit(clientIp(request.headers)).allowed) {
    return new NextResponse(null, { status: 429 });
  }
  if (ROBOT.test(request.headers.get('user-agent') ?? '')) {
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
  const parsed = visitBeaconSchema.safeParse(raw);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  try {
    await recordVisitBeacon(parsed.data);
  } catch (error) {
    // A lost beacon loses a little measurement and nothing else.
    logger.error('Storing a visit beacon failed', error);
    return new NextResponse(null, { status: 503 });
  }
  return new NextResponse(null, { status: 204 });
}
