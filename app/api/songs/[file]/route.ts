import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { songReadUrl } from '@/services/wedding-songs.service';

/**
 * `GET /api/songs/<file>` — plays one wedding song. It sends the browser on
 * to a signed bucket URL that lasts 15 minutes, so the audio streams from
 * Cloud Storage, with seeking, and not through this server.
 *
 * Only song file names (`lib/wedding-songs.ts`) are signed, and only in the
 * songs folder, so this cannot read anything else in the bucket. The song
 * itself is no secret: it plays on the couple's public site.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  try {
    const url = await songReadUrl(file);
    if (url === null) return new NextResponse(null, { status: 404 });
    return new NextResponse(null, {
      status: 302,
      // Shorter than the signed URL, so a kept answer never points at an expired one.
      headers: { Location: url, 'Cache-Control': 'private, max-age=600' },
    });
  } catch (error) {
    logger.error('Signing a wedding song failed', error, { file });
    return new NextResponse(null, { status: 503 });
  }
}
