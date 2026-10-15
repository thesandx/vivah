/**
 * The home page's "How it works" section: three steps, each with a phone
 * screen. Pure data and rules, no I/O, so the rules are tested without a
 * bucket.
 *
 * Each step's screen is an image. Until an admin uploads one from `/admin`,
 * the page shows the placeholder in `public/how-it-works/`. The browser always
 * asks `/api/how-it-works/<step>`, which answers with the uploaded image or
 * sends it on to the placeholder. So the home page stays static, and a new
 * image needs no deploy.
 */

export const STEP_NUMBERS = [1, 2, 3] as const;

export type StepNumber = (typeof STEP_NUMBERS)[number];

export interface HowItWorksStep {
  step: StepNumber;
  title: string;
  body: string;
  /** What the phone screen shows, for a screen reader. */
  alt: string;
}

export const HOW_IT_WORKS_STEPS: readonly HowItWorksStep[] = [
  {
    step: 1,
    title: 'Type your names',
    body: 'Both names, the wedding date and your WhatsApp number.',
    alt: 'The sign-up card on a phone, with the bride’s and groom’s names typed in.',
  },
  {
    step: 2,
    title: 'See your website',
    body: 'Your invite opens at once. Add the venue, time and map.',
    alt: 'A wedding invite on a phone that greets the guest by name.',
  },
  {
    step: 3,
    title: 'Send it to everyone',
    body: 'Publish, then send each guest a link that greets them by name.',
    alt: 'A WhatsApp chat on a phone with the invite link and a happy reply.',
  },
];

/** How long each step stays highlighted before the next one, in milliseconds. */
export const STEP_INTERVAL_MS = 5000;

/** The Firestore collection and the one document that holds the image paths. */
export const SITE_CONTENT_COLLECTION = 'siteContent';
export const HOW_IT_WORKS_DOC_ID = 'how-it-works-steps';

/** Image types an admin can upload. No SVG: it can carry a script. */
export const STEP_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * The largest image the bucket accepts. The admin page shrinks a photo to
 * `STEP_IMAGE_WIDTH` before it uploads, so a real upload is far smaller.
 */
export const MAX_STEP_IMAGE_BYTES = 1024 * 1024;

/** The width the admin page shrinks an upload to: twice the phone frame. */
export const STEP_IMAGE_WIDTH = 720;

const EXTENSIONS: Record<(typeof STEP_IMAGE_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Reads a step number from a URL segment or a form, or `null` when it is not one. */
export function parseStep(raw: unknown): StepNumber | null {
  const value = typeof raw === 'number' ? raw : Number(raw);
  return STEP_NUMBERS.find((step) => step === value) ?? null;
}

/** True when `contentType` is one an admin can upload. */
export function isStepImageType(
  contentType: string,
): contentType is (typeof STEP_IMAGE_TYPES)[number] {
  return (STEP_IMAGE_TYPES as readonly string[]).includes(contentType);
}

/**
 * The file name for a new upload. `token` makes it unique, so a replaced
 * image never shares a name with the one before it.
 */
export function stepImageFilename(
  step: StepNumber,
  contentType: (typeof STEP_IMAGE_TYPES)[number],
  token: string,
): string {
  return `step-${step}-${token.replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}.${EXTENSIONS[contentType]}`;
}

/** True when `filename` is a file name that `stepImageFilename` made for `step`. */
export function isStepImageFilename(step: StepNumber, filename: string): boolean {
  return new RegExp(`^step-${step}-[A-Za-z0-9]{1,24}\\.(jpg|png|webp)$`).test(filename);
}

/** The URL the home page loads a step's screen from. */
export function stepImageUrl(step: StepNumber): string {
  return `/api/how-it-works/${step}`;
}

/** The placeholder screen in `public/`, shown until an admin uploads one. */
export function placeholderImageUrl(step: StepNumber): string {
  return `/how-it-works/step-${step}.webp`;
}
