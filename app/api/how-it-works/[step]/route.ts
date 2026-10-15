import { parseStep, placeholderImageUrl } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import { getStepImages, readStepImage } from '@/services/site-content.service';

/**
 * `GET /api/how-it-works/<step>` — the phone screen for one step of the home
 * page's "How it works" section.
 *
 * It answers with the image an admin uploaded from `/admin`, or sends the
 * browser on to the placeholder in `public/how-it-works/`. The home page
 * stays a static page, and a new image needs no deploy.
 *
 * A failure also sends the placeholder: a broken phone screen on the home
 * page is worse than an old one. Browsers and proxies keep the answer for
 * five minutes, so a new image shows within about five minutes.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=86400';

/** After a failure, for a minute only, so the real image comes back soon. */
const CACHE_CONTROL_AFTER_ERROR = 'public, max-age=60';

function placeholder(location: string, cacheControl = CACHE_CONTROL): Response {
  return new Response(null, {
    status: 307,
    headers: { Location: location, 'Cache-Control': cacheControl },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ step: string }> },
): Promise<Response> {
  const step = parseStep((await params).step);
  if (step === null) return new Response('Not found', { status: 404 });

  try {
    const path = (await getStepImages())[`step${step}`];
    if (path === null) return placeholder(placeholderImageUrl(step));
    const image = await readStepImage(path);
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        'Content-Type': image.contentType,
        'Content-Length': String(image.bytes.byteLength),
        'Cache-Control': CACHE_CONTROL,
      },
    });
  } catch (error) {
    logger.error('Serving a How it works image failed', error, { step });
    return placeholder(placeholderImageUrl(step), CACHE_CONTROL_AFTER_ERROR);
  }
}
