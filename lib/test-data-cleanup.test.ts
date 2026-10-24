import { describe, expect, it } from 'vitest';

import {
  type CleanupLead,
  ERASE_LIMIT,
  leadCleanupChoice,
  liveLeadIds,
  parseEraseIds,
  weddingCleanupChoice,
} from '@/lib/test-data-cleanup';

const at = (iso: string) => new Date(iso);
const NOW = at('2026-10-24T10:00:00Z');
const ID = 'A'.repeat(20);

function lead(overrides: Partial<CleanupLead>): CleanupLead {
  return {
    id: ID,
    status: 'preview-sent',
    createdAt: at('2026-10-01T10:00:00Z'),
    deletedAt: null,
    weddingDate: null,
    ...overrides,
  };
}

describe('liveLeadIds', () => {
  it('names the previews of invites that are not deleted', () => {
    const live = liveLeadIds([
      { id: 'w1', leadId: 'live', deletedAt: null },
      { id: 'w2', leadId: 'gone', deletedAt: at('2026-10-20T00:00:00Z') },
    ]);
    expect([...live]).toEqual(['live']);
  });
});

describe('leadCleanupChoice', () => {
  it('never offers the preview of a live invite', () => {
    expect(leadCleanupChoice(lead({ status: 'paid' }), new Set([ID]), NOW)).toBe('kept');
  });

  it('ticks a paid preview whose invite is deleted', () => {
    expect(leadCleanupChoice(lead({ status: 'paid' }), new Set(), NOW)).toBe('ticked');
  });

  it('ticks a deleted preview, and one whose nudges are done', () => {
    const deleted = lead({ createdAt: NOW, deletedAt: NOW });
    expect(leadCleanupChoice(deleted, new Set(), NOW)).toBe('ticked');
    expect(leadCleanupChoice(lead({}), new Set(), NOW)).toBe('ticked');
  });

  it('leaves an unpaid preview in its week of nudges unticked', () => {
    const today = lead({ createdAt: at('2026-10-24T09:00:00Z') });
    const day3 = lead({ createdAt: at('2026-10-21T09:00:00Z') });
    expect(leadCleanupChoice(today, new Set(), NOW)).toBe('unticked');
    expect(leadCleanupChoice(day3, new Set(), NOW)).toBe('unticked');
  });
});

describe('weddingCleanupChoice', () => {
  it('offers only a deleted invite', () => {
    expect(weddingCleanupChoice({ id: 'w', leadId: 'l', deletedAt: null })).toBe('kept');
    expect(weddingCleanupChoice({ id: 'w', leadId: 'l', deletedAt: NOW })).toBe('ticked');
  });
});

describe('parseEraseIds', () => {
  it('keeps document ids only, once each', () => {
    expect(parseEraseIds([ID, ID, 'short', '../x', 42, null])).toEqual([ID]);
  });

  it('stops at the limit', () => {
    const many = Array.from({ length: ERASE_LIMIT + 5 }, (_, n) => n.toString().padStart(20, '0'));
    expect(parseEraseIds(many)).toHaveLength(ERASE_LIMIT);
  });
});
