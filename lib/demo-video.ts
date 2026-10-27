import { SITE_CONTENT_COLLECTION } from '@/lib/how-it-works';

/**
 * The site's uploaded videos (the home page's demo and the four on `/help`):
 * the rules for the file an admin uploads from the Home page tab of `/admin`. Pure, no I/O, so they are tested without a
 * bucket. `services/demo-video.service.ts` stores and signs the file.
 *
 * The video is an MP4 (H.264 and AAC), because every phone browser plays it.
 * It must be "fast start": the index (`moov`) comes before the media data
 * (`mdat`), so a phone starts to play after the first few hundred KB and
 * streams the rest. `/admin` checks this before it uploads, and also takes a
 * frame of the video as the poster, which shows at once when the dialog opens.
 *
 * Each upload gets a new file name. A replaced video stays in the bucket, so
 * a page a visitor opened before the change still plays.
 */

/**
 * The site's uploaded videos. Each slot is one video with its poster, in its
 * own document and its own bucket folder:
 *
 * - `demo` — the home page's "Watch a demo".
 * - `help-edit-details` — `/help`, "Change the time, venue or map".
 * - `help-guest-invite` — `/help`, "Make and send a personal invite".
 * - `help-functions` — `/help`, "Add your haldi, mehndi and other functions".
 * - `help-families` — `/help`, "Add your parents' and grandparents' names".
 *
 * They share every rule below: the type, the size, fast start and the names.
 */
export const SITE_VIDEO_SLOTS = [
  'demo',
  'help-edit-details',
  'help-guest-invite',
  'help-functions',
  'help-families',
] as const;

export type SiteVideoSlot = (typeof SITE_VIDEO_SLOTS)[number];

/** Reads a slot from a Server Action argument or a query string. */
export function parseSiteVideoSlot(raw: unknown): SiteVideoSlot | null {
  return SITE_VIDEO_SLOTS.find((slot) => slot === raw) ?? null;
}

/** The one document that names the home page's video, in `siteContent`. */
export const DEMO_VIDEO_DOC_ID = 'demo-video';

/** The document that names a slot's video, in `siteContent`. */
export function siteVideoDocId(slot: SiteVideoSlot): string {
  return slot === 'demo' ? DEMO_VIDEO_DOC_ID : `${slot}-video`;
}

/** The folder in the bucket. A slot's video and its poster live here and nowhere else. */
export function siteVideoFolder(slot: SiteVideoSlot): string {
  return `${SITE_CONTENT_COLLECTION}/${siteVideoDocId(slot)}/`;
}

/** The home page's folder. */
export const DEMO_VIDEO_FOLDER = siteVideoFolder('demo');

export const DEMO_VIDEO_TYPES = ['video/mp4'] as const;
export const DEMO_POSTER_TYPES = ['image/jpeg'] as const;

/** The largest video the bucket takes. A 1-minute 720p MP4 is about 6 MB. */
export const MAX_DEMO_VIDEO_BYTES = 40 * 1024 * 1024;

/** Above this, `/admin` warns that the video starts slower on a phone. */
export const SLOW_DEMO_VIDEO_BYTES = 12 * 1024 * 1024;

/** The poster is one 720px frame as a JPEG, about 60 KB. */
export const MAX_DEMO_POSTER_BYTES = 1024 * 1024;

export type DemoUploadKind = 'video' | 'poster';

/** Reads the kind of a demo upload from a Server Action argument. */
export function parseDemoUploadKind(raw: unknown): DemoUploadKind | null {
  return raw === 'video' || raw === 'poster' ? raw : null;
}

const PATTERN: Record<DemoUploadKind, RegExp> = {
  video: /^demo-video-[A-Za-z0-9]{1,24}\.mp4$/,
  poster: /^demo-poster-[A-Za-z0-9]{1,24}\.jpg$/,
};

/** The file name for a new upload. `token` makes it unique. */
export function demoFilename(kind: DemoUploadKind, token: string): string {
  const safe = token.replace(/[^A-Za-z0-9]/g, '').slice(0, 24);
  return kind === 'video' ? `demo-video-${safe}.mp4` : `demo-poster-${safe}.jpg`;
}

/** True when `filename` is a name `demoFilename` made for `kind`. */
export function isDemoFilenameFor(kind: DemoUploadKind, filename: string): boolean {
  return PATTERN[kind].test(filename);
}

/** True when `filename` is a demo video or poster name. */
export function isDemoFilename(filename: string): boolean {
  return isDemoFilenameFor('video', filename) || isDemoFilenameFor('poster', filename);
}

/** True when `contentType` is one `kind` takes. */
export function isDemoContentType(kind: DemoUploadKind, contentType: string): boolean {
  const allowed: readonly string[] = kind === 'video' ? DEMO_VIDEO_TYPES : DEMO_POSTER_TYPES;
  return allowed.includes(contentType);
}

/**
 * The route that signs a fresh URL for `file`. The page uses it only when the
 * URL it was given has expired, such as on a tab left open overnight.
 */
export function demoVideoRoute(file: string, slot: SiteVideoSlot = 'demo'): string {
  return slot === 'demo' ? `/api/demo-video/${file}` : `/api/demo-video/${file}?slot=${slot}`;
}

/** Reads `length` bytes of a file from `start`. A `File.slice` in the browser. */
export type ByteReader = (start: number, length: number) => Promise<Uint8Array>;

/** The most top-level boxes to step through before giving up. */
const MAX_BOXES = 64;

/**
 * Whether an MP4 is "fast start": its `moov` box comes before its `mdat`
 * box. Walks the top-level boxes from the start of the file, reading only
 * each box's header, so a 40 MB file costs a few reads of 16 bytes.
 *
 * @returns `true` for fast start, `false` when `mdat` comes first, and
 *          `null` when the file is not an MP4 this can read.
 */
export async function isFastStart(read: ByteReader, size: number): Promise<boolean | null> {
  let offset = 0;
  for (let index = 0; index < MAX_BOXES && offset + 8 <= size; index += 1) {
    const header = await read(offset, 16);
    if (header.length < 8) return null;
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    const type = String.fromCharCode(...header.subarray(4, 8));
    if (index === 0 && type !== 'ftyp') return null;
    if (type === 'moov') return true;
    if (type === 'mdat') return false;

    let boxSize = view.getUint32(0);
    if (boxSize === 1) {
      // A 64-bit size follows the type.
      if (header.length < 16) return null;
      boxSize = Number(view.getBigUint64(8));
    } else if (boxSize === 0) {
      // The box runs to the end of the file: nothing comes after it.
      return null;
    }
    if (boxSize < 8) return null;
    offset += boxSize;
  }
  return null;
}

/** What the walkthrough shows, in order. The dialog lists these until a video is uploaded. */
export const DEMO_STEPS: readonly string[] = [
  'A WhatsApp message arrives with your invite link.',
  'The guest taps the link. Your website opens with their name on it.',
  'A Shri Ganesh card says “Hi” with their name. One tap opens the invite and starts your song.',
  'They scratch to reveal the date, see the countdown and the venue map, then reply to you on WhatsApp.',
];
