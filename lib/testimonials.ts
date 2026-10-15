import { z } from 'zod';

/**
 * What couples say about vivah.online, for the home page: chat screenshots,
 * couple reviews, and the "Loved by …" banner. Pure rules, no I/O, so they
 * are tested without a database or a bucket.
 *
 * The content itself lives in Firestore, and the admin adds it from the Home
 * page tab of `/admin`. See `services/testimonials.service.ts`.
 *
 * Never add a review or a chat that a real couple did not send, and never set
 * a banner number that is not true: a made-up review or count is a false
 * claim under the consumer protection rules. Before you add one:
 *
 * 1. Get the couple's permission to publish it, in writing (a WhatsApp
 *    message is enough).
 * 2. Hide names, phone numbers and links in a screenshot.
 *
 * A section with no items does not show on the home page, and the banner
 * does not show until its line is set.
 */

/** The two kinds of item. Also the URL segment of their image route. */
export const TESTIMONIAL_KINDS = ['chat', 'review'] as const;

export type TestimonialKind = (typeof TESTIMONIAL_KINDS)[number];

export const CHAT_APPS = ['whatsapp', 'instagram'] as const;

export type ChatApp = (typeof CHAT_APPS)[number];

export const CHAT_APP_NAMES: Record<ChatApp, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
};

/** Most items of one kind. The home page shows them all, so the list stays short. */
export const MAX_TESTIMONIALS = 12;

const text = (max: number) => z.string().trim().max(max);

/** What the admin types for a chat screenshot. */
export const chatFieldsSchema = z.object({
  /** The line that matters, as sent, such as `He really liked the letter part`. */
  message: text(240).min(1, 'Type the message from the screenshot.'),
  /** Under the screenshot, such as `WhatsApp, a birthday gift`. Optional. */
  caption: text(80),
  app: z.enum(CHAT_APPS),
});

export type ChatFields = z.infer<typeof chatFieldsSchema>;

/** What the admin types for a couple's review. */
export const reviewFieldsSchema = z.object({
  /** Their words, as sent. */
  quote: text(400).min(1, 'Type the review.'),
  /** `Riya & Aman`. */
  names: text(60).min(1, 'Type the couple’s names.'),
  /** Who wrote it, such as `Bride and groom` or `Bride’s sister`. Optional. */
  relation: text(60),
  /** 1 to 5, as the couple gave it. */
  stars: z.coerce.number().int().min(1).max(5),
});

export type ReviewFields = z.infer<typeof reviewFieldsSchema>;

/** The banner's one line, such as `Loved by 500+ happy couples`. Empty hides it. */
export const bannerSchema = z.object({ headline: text(80) });

/** Image types an admin can upload. No SVG: it can carry a script. */
export const TESTIMONIAL_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type TestimonialImageType = (typeof TESTIMONIAL_IMAGE_TYPES)[number];

/**
 * The largest image the bucket accepts. The admin page shrinks a picture to
 * `TESTIMONIAL_IMAGE_WIDTH` first, so a real upload is far smaller.
 */
export const MAX_TESTIMONIAL_IMAGE_BYTES = 1024 * 1024;

/** The width the admin page shrinks an upload to: about twice the widest card. */
export const TESTIMONIAL_IMAGE_WIDTH: Record<TestimonialKind, number> = {
  chat: 720,
  review: 800,
};

const EXTENSIONS: Record<TestimonialImageType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Reads a kind from a URL segment, or `null` when it is not one. */
export function parseKind(raw: unknown): TestimonialKind | null {
  return TESTIMONIAL_KINDS.find((kind) => kind === raw) ?? null;
}

/** True when `contentType` is one an admin can upload. */
export function isTestimonialImageType(contentType: string): contentType is TestimonialImageType {
  return (TESTIMONIAL_IMAGE_TYPES as readonly string[]).includes(contentType);
}

/**
 * The file name for a new upload. `token` makes it unique, so a replaced
 * image never shares a name, or a cached URL, with the one before it.
 */
export function testimonialImageFilename(
  kind: TestimonialKind,
  contentType: TestimonialImageType,
  token: string,
): string {
  return `${kind}-${token.replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}.${EXTENSIONS[contentType]}`;
}

/** True when `filename` is one that `testimonialImageFilename` made for `kind`. */
export function isTestimonialImageFilename(kind: TestimonialKind, filename: string): boolean {
  return new RegExp(`^${kind}-[A-Za-z0-9]{1,24}\\.(jpg|png|webp)$`).test(filename);
}

/** True when `id` has the shape of a Firestore auto id. Guards the image route. */
export function isItemId(id: string): boolean {
  return /^[A-Za-z0-9]{10,40}$/.test(id);
}

/**
 * The URL the home page loads an item's image from. The `v` part changes
 * with each new upload, so the browser can keep an image for a year and
 * still shows a replacement at once.
 */
export function testimonialImageUrl(kind: TestimonialKind, id: string, path: string): string {
  return `/api/testimonials/${kind}/${id}?v=${imageVersion(path)}`;
}

/** The unique part of a stored image's file name. */
export function imageVersion(path: string): string {
  const filename = path.split('/').pop() ?? '';
  return filename.replace(/^[a-z]+-/, '').replace(/\.[a-z]+$/, '');
}

/**
 * Splits the banner line so the number stands out: `Loved by 500+ happy
 * couples` gives `500+` as `highlight`. A line with no number has none.
 */
export function splitHeadline(headline: string): {
  before: string;
  highlight: string;
  after: string;
} {
  const match = /\S*\d\S*/.exec(headline);
  if (match === null) return { before: headline, highlight: '', after: '' };
  return {
    before: headline.slice(0, match.index),
    highlight: match[0],
    after: headline.slice(match.index + match[0].length),
  };
}

/** What a screen reader hears for a chat screenshot. */
export function chatAlt(chat: Pick<ChatFields, 'app' | 'message'>): string {
  return `A ${CHAT_APP_NAMES[chat.app]} chat. The message says: ${chat.message}`;
}
