import { NextResponse } from 'next/server';

import { parseSiteVideoSlot } from '@/lib/demo-video';
import { logger } from '@/lib/logger';
import { demoReadUrl } from '@/services/demo-video.service';

/**
 * `GET /api/demo-video/<file>?slot=<slot>` — an uploaded video or its poster:
 * the home page's demo by default, or a `/help` video when `slot` names one,
 * through a signed bucket URL that lasts 15 minutes. The home page gives the
 * browser a signed URL directly, so this route is only the fallback for a
 * page whose URL has expired, such as a tab left open overnight.
 *
 * Only demo file names (`lib/demo-video.ts`) are signed, and only in the
 * slot's folder, so this cannot read anything else in the bucket.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  const rawSlot = new URL(request.url).searchParams.get('slot');
  const slot = rawSlot === null ? 'demo' : parseSiteVideoSlot(rawSlot);
  if (slot === null) return new NextResponse(null, { status: 404 });
  try {
    const url = await demoReadUrl(file, slot);
    if (url === null) return new NextResponse(null, { status: 404 });
    return new NextResponse(null, {
      status: 302,
      // Shorter than the signed URL, so a kept answer never points at an expired one.
      headers: { Location: url, 'Cache-Control': 'private, max-age=600' },
    });
  } catch (error) {
    logger.error('Signing the demo video failed', error, { file, slot });
    return new NextResponse(null, { status: 503 });
  }
}
