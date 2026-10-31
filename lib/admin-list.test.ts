import { describe, expect, it } from 'vitest';

import {
  countBy,
  filterLeads,
  filterWeddings,
  formatAdminTime,
  type LeadRow,
  leadState,
  parseLeadFilters,
  parseWeddingFilters,
  previewTimeNote,
  type WeddingRow,
  weddingState,
} from '@/lib/admin-list';

const at = (iso: string) => new Date(iso);

function wedding(overrides: Partial<WeddingRow>): WeddingRow {
  return {
    id: 'w',
    slug: 'radha-shyam',
    bride: 'Radha',
    groom: 'Shyam',
    weddingDate: null,
    ownerPhoneE164: '+919876543210',
    createdAt: at('2026-10-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

const WEDDINGS = [
  wedding({
    id: 'a',
    slug: 'anu-sandy',
    bride: 'Anu',
    groom: 'Sandy',
    weddingDate: '2026-12-01',
    createdAt: at('2026-10-03T00:00:00Z'),
  }),
  wedding({
    id: 'b',
    slug: 'zoya-kabir',
    bride: 'Zoya',
    groom: 'Kabir',
    weddingDate: '2026-01-10',
    status: 'unavailable',
    ownerPhoneE164: '+919546342507',
  }),
  wedding({
    id: 'c',
    slug: 'mira-dev',
    bride: 'Mira',
    groom: 'Dev',
    createdAt: at('2026-10-05T00:00:00Z'),
    deletedAt: at('2026-10-06T00:00:00Z'),
  }),
];

const ids = (rows: readonly { id: string }[]) => rows.map((row) => row.id);

describe('wedding filters', () => {
  it('reads the URL, and falls back on anything unknown', () => {
    expect(parseWeddingFilters({ q: ' anu ', state: 'live', sort: 'bogus' })).toEqual({
      q: 'anu',
      state: 'live',
      when: 'all',
      sort: 'newest',
    });
    expect(parseWeddingFilters({ state: ['unavailable', 'live'] }).state).toBe('unavailable');
    // Deleted is a tab of its own now, not a state on the Invites tab.
    expect(parseWeddingFilters({ state: 'deleted' }).state).toBe('all');
    expect(parseWeddingFilters({ sort: 'recently-deleted' }).sort).toBe('newest');
  });

  it('reads the Deleted tab: no state menu, newest delete first', () => {
    const filters = parseWeddingFilters({ state: 'live' }, 'deleted');
    expect(filters).toMatchObject({ state: 'all', sort: 'recently-deleted' });
    const rows = [
      wedding({ id: 'early', deletedAt: at('2026-10-01T00:00:00Z') }),
      wedding({ id: 'late', deletedAt: at('2026-10-09T00:00:00Z') }),
    ];
    expect(ids(filterWeddings(rows, filters, '2026-10-15'))).toEqual(['late', 'early']);
    expect(parseWeddingFilters({ sort: 'names' }, 'deleted').sort).toBe('names');
  });

  it('names each state', () => {
    expect(WEDDINGS.map(weddingState)).toEqual(['live', 'unavailable', 'deleted']);
  });

  it('filters by state, date and search, and sorts', () => {
    const base = parseWeddingFilters({});
    expect(ids(filterWeddings(WEDDINGS, base, '2026-10-15'))).toEqual(['c', 'a', 'b']);
    expect(ids(filterWeddings(WEDDINGS, { ...base, state: 'unavailable' }, '2026-10-15'))).toEqual([
      'b',
    ]);
    expect(ids(filterWeddings(WEDDINGS, { ...base, when: 'upcoming' }, '2026-10-15'))).toEqual([
      'a',
    ]);
    expect(ids(filterWeddings(WEDDINGS, { ...base, when: 'past' }, '2026-10-15'))).toEqual(['b']);
    expect(ids(filterWeddings(WEDDINGS, { ...base, when: 'no-date' }, '2026-10-15'))).toEqual([
      'c',
    ]);
    expect(ids(filterWeddings(WEDDINGS, { ...base, q: 'KABIR' }, '2026-10-15'))).toEqual(['b']);
    expect(ids(filterWeddings(WEDDINGS, { ...base, q: '95463' }, '2026-10-15'))).toEqual(['b']);
    expect(ids(filterWeddings(WEDDINGS, { ...base, q: 'mira-dev' }, '2026-10-15'))).toEqual(['c']);
    expect(ids(filterWeddings(WEDDINGS, { ...base, sort: 'oldest' }, '2026-10-15'))).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(
      ids(filterWeddings(WEDDINGS, { ...base, sort: 'wedding-soonest' }, '2026-10-15')),
    ).toEqual(['b', 'a', 'c']);
    expect(
      ids(filterWeddings(WEDDINGS, { ...base, sort: 'wedding-latest' }, '2026-10-15')),
    ).toEqual(['a', 'b', 'c']);
    expect(ids(filterWeddings(WEDDINGS, { ...base, sort: 'names' }, '2026-10-15'))).toEqual([
      'a',
      'c',
      'b',
    ]);
    expect(ids(filterWeddings(WEDDINGS, { ...base, sort: 'address' }, '2026-10-15'))).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('counts per state', () => {
    expect(countBy(WEDDINGS, weddingState).get('live')).toBe(1);
  });
});

function lead(overrides: Partial<LeadRow>): LeadRow {
  return {
    id: 'l',
    bride: 'Radha',
    groom: 'Shyam',
    weddingDate: null,
    phoneE164: '+919876543210',
    status: 'preview-sent',
    expiresAt: at('2026-10-16T00:00:00Z'),
    createdAt: at('2026-10-14T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

const NOW = at('2026-10-15T00:00:00Z');
const LEADS = [
  lead({ id: 'sent' }),
  lead({ id: 'opened', status: 'opened', bride: 'Anu', expiresAt: at('2026-10-15T12:00:00Z') }),
  lead({
    id: 'expired',
    expiresAt: at('2026-10-14T12:00:00Z'),
    createdAt: at('2026-10-12T00:00:00Z'),
  }),
  lead({
    id: 'paid',
    status: 'paid',
    expiresAt: at('2026-10-01T00:00:00Z'),
    weddingSlug: 'zoya-kabir',
  }),
  lead({ id: 'deleted', deletedAt: at('2026-10-14T00:00:00Z') }),
];

describe('lead filters', () => {
  it('names each state; a paid lead never expires', () => {
    expect(LEADS.map((row) => leadState(row, NOW))).toEqual([
      'sent',
      'opened',
      'expired',
      'paid',
      'deleted',
    ]);
  });

  it('filters and sorts', () => {
    const base = parseLeadFilters({});
    expect(ids(filterLeads(LEADS, { ...base, state: 'expired' }, NOW))).toEqual(['expired']);
    expect(ids(filterLeads(LEADS, { ...base, q: 'zoya' }, NOW))).toEqual(['paid']);
    expect(ids(filterLeads(LEADS, { ...base, sort: 'expiring' }, NOW))[0]).toBe('paid');
    expect(ids(filterLeads(LEADS, { ...base, sort: 'oldest' }, NOW))[0]).toBe('expired');
    expect(ids(filterLeads(LEADS, { ...base, sort: 'names' }, NOW))[0]).toBe('opened');
    expect(filterLeads(LEADS, base, NOW)).toHaveLength(5);
  });

  it('filters by tag, an untagged lead being New', () => {
    const base = parseLeadFilters({ tag: 'hot' });
    expect(base.tag).toBe('hot');
    expect(parseLeadFilters({ tag: 'warm' }).tag).toBe('all');
    const tagged = LEADS.map((row, index) =>
      index === 1
        ? { ...row, tag: 'hot' as const }
        : index === 2
          ? { ...row, tag: 'test' as const }
          : row,
    );
    expect(ids(filterLeads(tagged, base, NOW))).toEqual(['opened']);
    expect(filterLeads(tagged, { ...base, tag: 'new' }, NOW)).toHaveLength(3);
  });

  it('filters Old: still New, and made more than 24 hours ago', () => {
    const old = { ...parseLeadFilters({ tag: 'old' }) };
    expect(old.tag).toBe('old');
    expect(ids(filterLeads(LEADS, old, NOW))).toEqual(['expired']);
    const tagged = LEADS.map((row) =>
      row.id === 'expired' ? { ...row, tag: 'cold' as const } : row,
    );
    expect(filterLeads(tagged, old, NOW)).toHaveLength(0);
  });
});

describe('formatAdminTime', () => {
  it('writes India time', () => {
    expect(formatAdminTime(at('2026-10-15T09:15:00Z'))).toMatch(/15 Oct 2026.*2:45/);
  });
});

describe('preview timer in the admin', () => {
  it('closes a preview when its 30 minutes end, before the link expiry', () => {
    const row = lead({ status: 'opened', viewEndsAt: at('2026-10-14T23:59:00Z') });
    expect(leadState(row, NOW)).toBe('expired');
    expect(previewTimeNote(row, NOW)).toBeNull();
  });

  it('shows the minutes left while the timer runs', () => {
    const row = lead({ status: 'opened', viewEndsAt: at('2026-10-15T00:12:00Z') });
    expect(leadState(row, NOW)).toBe('opened');
    expect(previewTimeNote(row, NOW)).toMatch(/^12 min left · closes /);
  });

  it('says the timer has not started for an unopened link', () => {
    expect(previewTimeNote(lead({}), NOW)).toMatch(/^timer starts on first open · link expires /);
  });
});
