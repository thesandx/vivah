/**
 * Messages for a Server Action call that threw.
 *
 * Each deploy gives every Server Action a new id. A page opened before a
 * deploy still calls the old ids, and the server answers 409 "Server Action
 * unavailable". Nothing is wrong with what the person chose: the page is out
 * of date, and a reload fixes it.
 */

/** What the person sees when the page is older than the site. */
export const STALE_PAGE_MESSAGE =
  'The site was updated since you opened this page. Reload the page and try again.';

/**
 * True when a Server Action call failed because the server does not know the
 * action. Next throws an `UnrecognizedActionError` for that answer. This
 * checks its name, as `unstable_isUnrecognizedActionError` from
 * `next/navigation` checks its class, so this module stays plain and the
 * tests that mock `next/navigation` need nothing extra.
 */
export function isStalePageError(error: unknown): boolean {
  return error instanceof Error && error.name === 'UnrecognizedActionError';
}

/** The message for `error`: the reload message for an out-of-date page, else `fallback`. */
export function actionErrorMessage(error: unknown, fallback: string): string {
  return isStalePageError(error) ? STALE_PAGE_MESSAGE : fallback;
}
