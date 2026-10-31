/**
 * The admin's own tag on a preview: how warm the lead is. Pure, so it is
 * tested alone.
 *
 * Every preview starts as `new`. The admin marks it `hot` (talking, likely to
 * pay), `cold` (not now, or said no) or `test` (one of our own). Nothing in
 * the product reads it: it sorts the admin's follow-ups, and the preview
 * funnel leaves `test` previews out.
 *
 * `old` is never stored. A `new` preview shows as `old` once it is more than
 * 24 hours old, so the admin sees which leads nobody sorted in time. A manual
 * tag always wins.
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

/** After this long, a preview that is still `new` shows as `old`. */
export const OLD_LEAD_AFTER_MS = 24 * 60 * 60_000;

/** The tags the admin sees and filters on: the stored ones, plus `old`. */
export const SHOWN_LEAD_TAGS = ['new', 'old', 'hot', 'cold', 'test'] as const;

export type ShownLeadTag = (typeof SHOWN_LEAD_TAGS)[number];

export const SHOWN_LEAD_TAG_LABELS: Record<ShownLeadTag, string> = {
  ...LEAD_TAG_LABELS,
  old: 'Old',
};

export const SHOWN_LEAD_TAG_HINTS: Record<ShownLeadTag, string> = {
  ...LEAD_TAG_HINTS,
  old: 'New for more than 24 hours, and not sorted yet.',
};

/**
 * The tag the admin sees: `old` for a `new` preview made more than 24 hours
 * ago, else the stored tag.
 */
export function shownLeadTag(
  row: { tag?: LeadTag | undefined; createdAt: Date },
  now: Date,
): ShownLeadTag {
  const tag = leadTag(row);
  if (tag !== 'new') return tag;
  return now.getTime() - row.createdAt.getTime() > OLD_LEAD_AFTER_MS ? 'old' : 'new';
}

/** Reads a tag from a form or URL. `null` for anything else. */
export function parseLeadTag(raw: string): LeadTag | null {
  return (LEAD_TAGS as readonly string[]).includes(raw) ? (raw as LeadTag) : null;
}
