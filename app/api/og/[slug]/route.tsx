import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { parseGuestName } from '@/lib/guest-name';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '@/lib/invite-meta';
import { drawableInLatinFonts, INVITE_PALETTE } from '@/lib/invite-palette';
import { logger } from '@/lib/logger';
import { isSampleSlug, sampleWedding } from '@/lib/sample-invite';
import { formatWeddingDate } from '@/lib/wedding-date';
import { getWeddingBySlug } from '@/services/wedding.service';

/**
 * `GET /api/og/<slug>?guest=Kartheek` — the portrait card in a guest's
 * WhatsApp link preview: "Hi Kartheek, we joyfully invite you to celebrate
 * our wedding", the couple's names and the day, in Martel, inside an arch.
 * `lib/invite-meta.ts` puts this URL in `og:image`.
 *
 * The artwork is one fixed picture, `public/invite/og-card.png`: the arch,
 * blossoms, lanterns, the couple (a licensed Vecteezy vector), the Ganesha
 * and "शुभ विवाह". The renderer (satori) does not shape Devanagari, so the
 * Devanagari title is part of the picture, not text. Only the guest, the
 * names and the date are drawn here. The picture is a 256-colour PNG, which
 * keeps the whole card under WhatsApp's ~300 KB limit for a large preview.
 *
 * Node runtime, because the picture and the fonts are read from `public/`,
 * which the Dockerfile copies next to `server.js`. Satori reads WOFF and TTF,
 * not WOFF2, so the Martel `.woff` files are here for this route only.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The card's text colours, chosen to sit on the cream arch of the picture. */
const CARD = {
  names: '#8f1d2c',
  text: INVITE_PALETTE.ink,
  gold: '#c99a3a',
} as const;

/** The arch's inner column in the picture, where the text goes. */
const TEXT_BOX = { left: 230, top: 300, width: 620 } as const;

interface CardAssets {
  art: string;
  regular: Buffer;
  bold: Buffer;
  heavy: Buffer;
}

/** Loaded once per instance. A failed read is retried on the next request. */
let assets: Promise<CardAssets> | null = null;

function loadAssets(): Promise<CardAssets> {
  const pub = join(process.cwd(), 'public');
  const font = (file: string): Promise<Buffer> => readFile(join(pub, 'fonts', file));
  assets ??= Promise.all([
    readFile(join(pub, 'invite', 'og-card.png')),
    font('martel-400.woff'),
    font('martel-700.woff'),
    font('martel-800.woff'),
  ])
    .then(([art, regular, bold, heavy]) => ({
      art: `data:image/png;base64,${art.toString('base64')}`,
      regular,
      bold,
      heavy,
    }))
    .catch((error: unknown) => {
      assets = null;
      throw error;
    });
  return assets;
}

/** One name on its own line; a long name gets a smaller size so it fits the arch. */
function nameSize(bride: string, groom: string): number {
  const longest = Math.max(bride.length, groom.length);
  if (longest <= 9) return 92;
  if (longest <= 12) return 72;
  return 56;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  try {
    // The sample invite has no document; a real wedding at its address wins.
    const wedding =
      (await getWeddingBySlug(slug)) ?? (isSampleSlug(slug) ? sampleWedding(new Date()) : null);
    // An unavailable invite shows no names in a link preview either.
    if (wedding === null || ('status' in wedding && wedding.status === 'unavailable')) {
      return new Response('Not found', { status: 404 });
    }

    const raw = new URL(request.url).searchParams.get('guest');
    const parsed = raw === null ? null : parseGuestName(raw);
    const guest = parsed !== null && drawableInLatinFonts(parsed) ? parsed : null;
    const showNames = drawableInLatinFonts(`${wedding.bride} & ${wedding.groom}`);
    const size = nameSize(wedding.bride, wedding.groom);
    const { art, regular, bold, heavy } = await loadAssets();

    const line = { display: 'flex', justifyContent: 'center', textAlign: 'center' } as const;
    const name = { ...line, fontSize: size, fontWeight: 800, color: CARD.names, lineHeight: 1.05 };

    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          fontFamily: 'Martel',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- satori draws a plain img, not next/image */}
        <img
          src={art}
          alt=""
          width={OG_IMAGE_WIDTH}
          height={OG_IMAGE_HEIGHT}
          style={{ position: 'absolute', left: 0, top: 0 }}
        />
        <div
          style={{
            position: 'absolute',
            ...TEXT_BOX,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {guest !== null && (
            <div style={{ ...line, fontSize: 50, fontWeight: 700, color: CARD.text }}>
              {`Hi ${guest},`}
            </div>
          )}
          <div
            style={{
              ...line,
              fontSize: 31,
              color: CARD.text,
              marginTop: guest === null ? 0 : 14,
              lineHeight: 1.35,
            }}
          >
            We joyfully invite you
          </div>
          <div style={{ ...line, fontSize: 31, color: CARD.text, lineHeight: 1.35 }}>
            to celebrate our wedding
          </div>
          {showNames && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 30 }}>
              <div style={name}>{wedding.bride}</div>
              <div
                style={{
                  ...line,
                  fontSize: 40,
                  fontWeight: 700,
                  color: CARD.gold,
                  lineHeight: 1.2,
                }}
              >
                &
              </div>
              <div style={name}>{wedding.groom}</div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 26 }}>
            <div style={{ display: 'flex', width: 70, height: 2, background: CARD.gold }} />
            <div
              style={{
                display: 'flex',
                width: 10,
                height: 10,
                background: CARD.gold,
                transform: 'rotate(45deg)',
              }}
            />
            <div style={{ display: 'flex', width: 70, height: 2, background: CARD.gold }} />
          </div>
          <div style={{ ...line, fontSize: 32, fontWeight: 700, color: CARD.text, marginTop: 14 }}>
            {wedding.weddingDate === null
              ? 'Save the date'
              : formatWeddingDate(wedding.weddingDate)}
          </div>
        </div>
      </div>,
      {
        width: OG_IMAGE_WIDTH,
        height: OG_IMAGE_HEIGHT,
        fonts: [
          { name: 'Martel', data: regular, weight: 400, style: 'normal' },
          { name: 'Martel', data: bold, weight: 700, style: 'normal' },
          { name: 'Martel', data: heavy, weight: 800, style: 'normal' },
        ],
        headers: {
          // WhatsApp fetches the image once per shared link. An hour keeps a
          // date change from showing an old image for long.
          'Cache-Control': 'public, max-age=3600',
        },
      },
    );
  } catch (error) {
    logger.error('Drawing an invite preview image failed', error, { slug });
    return new Response('Preview image unavailable', { status: 500 });
  }
}
