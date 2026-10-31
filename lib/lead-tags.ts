/**
 * The admin's own tag on a preview: how warm the lead is. Pure, so it is
 * tested alone.
 *
 * Every preview starts as `new`. The admin marks it `hot` (talking, likely to
 * pay), `cold` (not now, or said no) or `test` (one of our own). Nothing in
 * the product reads it: it sorts the admin's follow-ups, and the preview
 * funnel leaves `test` previews out.
 */

export const LEAD_TAGS = ['new', 'hot', 'cold', 'test'] as const;

export type LeadTag = (typeof LEAD_TAGS)[number];

export const LEAD_TAG_LABELS: Record<LeadTag, string> = {
  new: 'New',
  hot: 'Hot',
  cold: 'Cold',
  test: 'Test',
};

/** What each tag means, for the admin's card. */
export const LEAD_TAG_HINTS: Record<LeadTag, string> = {
  new: 'Not sorted yet.',
  hot: 'Talking to us, likely to pay.',
  cold: 'Not now, or said no.',
  test: 'One of ours. Left out of the preview tracker.',
};

/** A preview's tag. Absent, as on every preview before tags: `new`. */
export function leadTag(row: { tag?: LeadTag | undefined }): LeadTag {
  return row.tag ?? 'new';
}

/** Reads a tag from a form or URL. `null` for anything else. */
export function parseLeadTag(raw: string): LeadTag | null {
  return (LEAD_TAGS as readonly string[]).includes(raw) ? (raw as LeadTag) : null;
}
