import { describe, expect, it } from 'vitest';

import { LEAD_TAG_LABELS, LEAD_TAGS, leadTag, parseLeadTag } from '@/lib/lead-tags';

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
});
