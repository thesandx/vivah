import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { parseGuestName } from '@/lib/guest-name';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '@/lib/invite-meta';
import { drawableInLatinFonts, INVITE_PALETTE as C } from '@/lib/invite-palette';
import { logger } from '@/lib/logger';
import { formatWeddingDate } from '@/lib/wedding-date';
import { getWeddingBySlug } from '@/services/wedding.service';

/**
 * `GET /api/og/<slug>?guest=Kartheek` — the large image in a guest's
 * WhatsApp link preview: "Hi Kartheek," above the couple's names and day, in
 * maroon and gold. `lib/invite-meta.ts` puts this URL in `og:image`.
 *
 * Node runtime, because the fonts are read from `public/fonts`, which the
 * Dockerfile copies next to `server.js`. The image renderer (satori) reads
 * WOFF and TTF, not WOFF2, so the `.woff` files are here for this route only.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Loaded once per instance. A failed read is retried on the next request. */
let fonts: Promise<{ serif: Buffer; script: Buffer }> | null = null;

function loadFonts(): Promise<{ serif: Buffer; script: Buffer }> {
  const dir = join(process.cwd(), 'public', 'fonts');
  fonts ??= Promise.all([
    readFile(join(dir, 'cormorantgaramond-600.woff')),
    readFile(join(dir, 'greatvibes-400.woff')),
  ])
    .then(([serif, script]) => ({ serif, script }))
    .catch((error: unknown) => {
      fonts = null;
      throw error;
    });
  return fonts;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  try {
    const wedding = await getWeddingBySlug(slug);
    // An unavailable invite shows no names in a link preview either.
    if (wedding === null || wedding.status === 'unavailable') {
      return new Response('Not found', { status: 404 });
    }

    const raw = new URL(request.url).searchParams.get('guest');
    const parsed = raw === null ? null : parseGuestName(raw);
    const guest = parsed !== null && drawableInLatinFonts(parsed) ? parsed : null;
    const couple = `${wedding.bride} & ${wedding.groom}`;
    const coupleSize = drawableInLatinFonts(couple) ? (couple.length > 22 ? 92 : 116) : 0;
    const { serif, script } = await loadFonts();

    const image = new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          padding: 28,
          background: C.brand,
          fontFamily: 'Cormorant',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            border: `4px solid ${C.gold}`,
            borderRadius: 18,
            color: C.paper,
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', fontSize: 34, color: C.marigold, letterSpacing: 6 }}>
            SHUBH VIVAH
          </div>
          {guest !== null && (
            <div
              style={{
                display: 'flex',
                fontFamily: 'Great Vibes',
                fontSize: 72,
                color: C.marigold,
              }}
            >
              {`Hi ${guest},`}
            </div>
          )}
          <div style={{ display: 'flex', fontSize: 30, color: C.paper }}>
            you are invited to the wedding of
          </div>
          {coupleSize > 0 ? (
            <div
              style={{
                display: 'flex',
                fontFamily: 'Great Vibes',
                fontSize: coupleSize,
                lineHeight: 1.1,
              }}
            >
              {couple}
            </div>
          ) : (
            <div style={{ display: 'flex', fontSize: 64 }}>our wedding</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
            <div style={{ display: 'flex', width: 90, height: 3, background: C.gold }} />
            <div
              style={{
                display: 'flex',
                width: 14,
                height: 14,
                borderRadius: 7,
                background: C.orange,
              }}
            />
            <div style={{ display: 'flex', width: 90, height: 3, background: C.gold }} />
          </div>
          <div style={{ display: 'flex', fontSize: 38, color: C.paper }}>
            {wedding.weddingDate === null
              ? 'Save the date'
              : formatWeddingDate(wedding.weddingDate)}
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: C.gold, marginTop: 10 }}>
            vivah.online
          </div>
        </div>
      </div>,
      {
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        fonts: [
          { name: 'Cormorant', data: serif, weight: 600, style: 'normal' },
          { name: 'Great Vibes', data: script, weight: 400, style: 'normal' },
        ],
        headers: {
          // WhatsApp fetches the image once per shared link. An hour keeps a
          // date change from showing an old image for long.
          'Cache-Control': 'public, max-age=3600',
        },
      },
    );
    return image;
  } catch (error) {
    logger.error('Drawing an invite preview image failed', error, { slug });
    return new Response('Preview image unavailable', { status: 500 });
  }
}
