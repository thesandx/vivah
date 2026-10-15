import { logger } from '@/lib/logger';
import { imageVersion, isItemId, parseKind } from '@/lib/testimonials';
import { getTestimonialImagePath, readTestimonialImage } from '@/services/testimonials.service';

/**
 * `GET /api/testimonials/<chat|review>/<id>?v=<version>` — the image of one
 * chat screenshot or couple review on the home page. The bucket is private,
 * so this route reads the object and sends its bytes.
 *
 * The home page asks with `v`, the unique part of the image's file name.
 * When `v` matches the stored image, the answer can be kept for a year: a
 * replaced image gets a new file name, so a new `v`, so a new URL. Without a
 * match the answer is kept for five minutes only.
 *
 * A removed item answers 404, and the card is gone from the page by then.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_FOREVER = 'public, max-age=31536000, immutable';
const CACHE_SHORT = 'public, max-age=300';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
): Promise<Response> {
  const raw = await params;
  const kind = parseKind(raw.kind);
  if (kind === null || !isItemId(raw.id)) return new Response('Not found', { status: 404 });

  try {
    const path = await getTestimonialImagePath(kind, raw.id);
    if (path === null) return new Response('Not found', { status: 404 });
    const image = await readTestimonialImage(path);
    const version = new URL(request.url).searchParams.get('v');
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        'Content-Type': image.contentType,
        'Content-Length': String(image.bytes.byteLength),
        'Cache-Control': version === imageVersion(path) ? CACHE_FOREVER : CACHE_SHORT,
      },
    });
  } catch (error) {
    logger.error('Serving a testimonial image failed', error, { kind, id: raw.id });
    return new Response('Unavailable', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
