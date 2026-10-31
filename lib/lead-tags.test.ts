import { describe, expect, it } from 'vitest';

import {
  LEAD_TAG_LABELS,
  LEAD_TAGS,
  leadTag,
  parseLeadTag,
  SHOWN_LEAD_TAG_LABELS,
  shownLeadTag,
} from '@/lib/lead-tags';

describe('lead tags', () => {
  it('reads an untagged lead as New', () => {
    expect(leadTag({})).toBe('new');
    expect(leadTag({ tag: 'hot' })).toBe('hot');
  });

  it('accepts only the four tags', () => {
    expect(LEAD_TAGS.map((tag) => parseLeadTag(tag))).toEqual(['new', 'hot', 'cold', 'test']);
    expect(parseLeadTag('warm')).toBeNull();
    expect(parseLeadTag('')).toBeNull();
  });

  it('has a label for each tag', () => {
    expect(LEAD_TAGS.map((tag) => LEAD_TAG_LABELS[tag])).toEqual(['New', 'Hot', 'Cold', 'Test']);
  });

  it('shows a New preview as Old after 24 hours, and a manual tag always wins', () => {
    const now = new Date('2026-10-31T12:00:00Z');
    const madeAt = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 60 * 60_000);
    expect(shownLeadTag({ createdAt: madeAt(23) }, now)).toBe('new');
    expect(shownLeadTag({ createdAt: madeAt(24) }, now)).toBe('new');
    expect(shownLeadTag({ createdAt: madeAt(25) }, now)).toBe('old');
    expect(shownLeadTag({ tag: 'new', createdAt: madeAt(48) }, now)).toBe('old');
    expect(shownLeadTag({ tag: 'hot', createdAt: madeAt(48) }, now)).toBe('hot');
    expect(shownLeadTag({ tag: 'cold', createdAt: madeAt(48) }, now)).toBe('cold');
    expect(shownLeadTag({ tag: 'test', createdAt: madeAt(48) }, now)).toBe('test');
    expect(SHOWN_LEAD_TAG_LABELS.old).toBe('Old');
  });
});
