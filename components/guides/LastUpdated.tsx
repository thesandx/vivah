import { CONTENT_UPDATED, formatUpdated } from '@/lib/seo';

/**
 * The visible "Last updated" line. It reads the same date as the page's
 * `dateModified`, so the two can never disagree.
 */
export function LastUpdated() {
  return (
    <p className="text-small text-ink-soft">
      Last updated <time dateTime={CONTENT_UPDATED}>{formatUpdated(CONTENT_UPDATED)}</time>
    </p>
  );
}
