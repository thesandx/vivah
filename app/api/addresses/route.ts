import { NextResponse } from 'next/server';
import { z } from 'zod';

import { env } from '@/lib/env';
import { coupleNameSchema } from '@/lib/lead-schema';
import { logger } from '@/lib/logger';
import { clientIp, RateLimiter } from '@/lib/rate-limit';
import { inviteDomainLabel } from '@/lib/site-host';
import { checkSlug, freeSlugSuggestions } from '@/services/wedding.service';

/**
 * `GET /api/addresses` — the address step of the sign-up card (step 3).
 *
 *   - `?bride=Radha&groom=Shyam` answers `{ suggestions, domainLabel }`: the
 *     first free addresses for the couple, best first.
 *   - `?slug=virushka` answers whether one typed address is free.
 *
 * A read with no session: reads are public, and it changes nothing. It tells
 * a stranger only what visiting `<slug>.vivah.online` already tells them. A
 * check costs two document reads, so each visitor gets 60 calls a minute.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = new RateLimiter({ limit: 60, windowMs: 60_000 });

const NO_STORE = { 'Cache-Control': 'no-store' };

/** The longest typed address read. Longer than any valid slug. */
const MAX_SLUG_INPUT = 100;

const namesQuery = z.object({ bride: coupleNameSchema, groom: coupleNameSchema });

export async function GET(request: Request): Promise<NextResponse> {
  const verdict = limiter.hit(clientIp(request.headers));
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many checks. Wait a minute, then try again.' },
      { status: 429, headers: { 'Retry-After': String(verdict.retryAfterSeconds) } },
    );
  }

  const params = new URL(request.url).searchParams;
  const slug = params.get('slug');

  try {
    if (slug !== null) {
      if (slug.length > MAX_SLUG_INPUT) {
        return NextResponse.json(
          { available: false, reason: 'invalid', message: 'Use 40 characters or fewer.' },
          { headers: NO_STORE },
        );
      }
      return NextResponse.json(await checkSlug(slug), { headers: NO_STORE });
    }

    const names = namesQuery.safeParse({
      bride: params.get('bride') ?? '',
      groom: params.get('groom') ?? '',
    });
    if (!names.success) {
      return NextResponse.json(
        { error: 'invalid_query', message: 'Send both names, or one address.' },
        { status: 400 },
      );
    }
    const suggestions = await freeSlugSuggestions(names.data.bride, names.data.groom);
    return NextResponse.json(
      { suggestions, domainLabel: inviteDomainLabel(env.rootDomain) },
      { headers: NO_STORE },
    );
  } catch (error) {
    logger.error('Checking addresses failed', error);
    return NextResponse.json(
      { error: 'unavailable', message: 'We could not check addresses. Try again.' },
      { status: 503 },
    );
  }
}
