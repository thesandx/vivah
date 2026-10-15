import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { listSongOptions } from '@/services/wedding-songs.service';

/**
 * `GET /api/songs` — the songs on step 4 of the sign-up card, in slot order:
 * `{ songs: [{ slot, name, src }] }`. An admin sets them in `/admin`.
 *
 * A public read. Browsers and proxies keep the answer for a minute, so a
 * busy home page reads the document about once a minute per instance.
 * A failure answers an empty list: the card then skips the song step.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(
      { songs: await listSongOptions() },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=600' } },
    );
  } catch (error) {
    logger.error('Listing the wedding songs failed', error);
    return NextResponse.json({ songs: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
