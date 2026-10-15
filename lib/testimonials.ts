/**
 * What couples say about vivah.online, for the two carousels on the home page.
 * Pure data, no I/O.
 *
 * Every entry starts empty, and an empty entry shows as an open slot. Never
 * write a review or a chat that a real couple did not send: a made-up review
 * is a false claim under the consumer protection rules. To add a real one:
 *
 * 1. Get the couple's permission to publish it, in writing (a WhatsApp
 *    message is enough). Hide phone numbers in a screenshot.
 * 2. Put the photo or screenshot in `public/testimonials/`.
 * 3. Fill in the entry: `image` is the path under `public/`, such as
 *    `/testimonials/riya-aman.jpg`.
 */

export interface Review {
  id: string;
  /** `Riya and Aman`. */
  names: string | null;
  /** `Patna`. */
  city: string | null;
  /** Their words, as sent. */
  quote: string | null;
  /** The couple's photo, a path under `public/`. */
  image: string | null;
  /** 1 to 5, as the couple gave it. */
  stars: number | null;
}

export interface ChatShot {
  id: string;
  /** Where the message came from. Decides the frame's colour. */
  app: 'whatsapp' | 'instagram';
  /** The screenshot, a path under `public/`. */
  image: string | null;
  /** What the screenshot says, for screen readers. Required with `image`. */
  alt: string | null;
}

function emptyReview(id: string): Review {
  return { id, names: null, city: null, quote: null, image: null, stars: null };
}

function emptyChat(id: string, app: ChatShot['app']): ChatShot {
  return { id, app, image: null, alt: null };
}

export const REVIEWS: readonly Review[] = [
  emptyReview('review-1'),
  emptyReview('review-2'),
  emptyReview('review-3'),
  emptyReview('review-4'),
  emptyReview('review-5'),
  emptyReview('review-6'),
];

export const CHAT_SHOTS: readonly ChatShot[] = [
  emptyChat('chat-1', 'whatsapp'),
  emptyChat('chat-2', 'instagram'),
  emptyChat('chat-3', 'whatsapp'),
  emptyChat('chat-4', 'instagram'),
  emptyChat('chat-5', 'whatsapp'),
  emptyChat('chat-6', 'instagram'),
];

/** True when a review has the words to show. Anything less is an open slot. */
export function isPublishedReview(
  review: Review,
): review is Review & { quote: string; names: string } {
  return review.quote !== null && review.names !== null;
}

/** True when a chat has a screenshot and the words that describe it. */
export function isPublishedChat(chat: ChatShot): chat is ChatShot & { image: string; alt: string } {
  return chat.image !== null && chat.alt !== null;
}
