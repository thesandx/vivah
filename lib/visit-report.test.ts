import { describe, expect, it } from 'vitest';

import { buildVisitReport, type StoredBeacon, visitRangeFrom } from '@/lib/visit-report';

function beacon(visitId: string, patch: Partial<StoredBeacon> = {}): StoredBeacon {
  return { visitId, device: 'phone', sectionMs: {}, clicks: [], steps: [], ...patch };
}

const LEAD_A = 'AAAAAAAAAAAAAAAAAAAA';
const LEAD_B = 'BBBBBBBBBBBBBBBBBBBB';

const BEACONS: StoredBeacon[] = [
  // Visit 1: scrolls to How it works, taps its CTA, makes a preview and pays.
  beacon('v1', {
    source: 'google-ads',
    campaign: 'search-core',
    sectionMs: { hero: 5000, try: 20_000 },
    clicks: ['try-cta'],
  }),
  beacon('v1', {
    source: null,
    sectionMs: { how: 3000 },
    clicks: ['how-cta'],
    steps: ['started', 'details', 'functions', 'address', 'song'],
  }),
  beacon('v1', { lead: { id: LEAD_A, cta: 'how-cta' }, steps: ['made'] }),
  // Visit 2: reads the hero and the try section, leaves.
  beacon('v2', { source: 'instagram', sectionMs: { hero: 8000, try: 2000, guests: 400 } }),
  // Visit 3: makes a preview from the hero card, on a desktop, does not pay.
  beacon('v3', {
    device: 'desktop',
    sectionMs: { hero: 60_000 },
    clicks: ['hero-card'],
    steps: ['started', 'details'],
  }),
  beacon('v3', { device: 'desktop', lead: { id: LEAD_B, cta: 'hero-card' } }),
];

const report = buildVisitReport(BEACONS, (id) => id === LEAD_A);

describe('buildVisitReport', () => {
  it('merges beacons into visits and counts previews and payments', () => {
    expect(report.visits).toBe(3);
    expect(report.convertedVisits).toBe(2);
    expect(report.previews).toBe(2);
    expect(report.paid).toBe(1);
  });

  it('counts a section as seen only after a second', () => {
    const guests = report.sections.find((row) => row.id === 'guests');
    expect(guests?.seen).toBe(0);
    const try_ = report.sections.find((row) => row.id === 'try');
    expect(try_).toMatchObject({ seen: 2, seenPercent: 67, medianSeconds: 11 });
  });

  it('says where visits with no preview stopped', () => {
    expect(report.sections.find((row) => row.id === 'try')?.leftHere).toBe(1);
    expect(report.sections.reduce((sum, row) => sum + row.leftHere, 0)).toBe(1);
  });

  it('shares the time between the sections', () => {
    const hero = report.sections.find((row) => row.id === 'hero');
    // 73 s of 98.4 s.
    expect(hero?.timeShare).toBe(74);
  });

  it('counts each sign-up step once per visit, and a lead as a made preview', () => {
    const step = (id: string) => report.steps.find((row) => row.id === id)?.visits;
    expect(step('started')).toBe(2);
    expect(step('details')).toBe(2);
    expect(step('song')).toBe(1);
    expect(step('made')).toBe(2);
  });

  it('credits each preview to its button, with payments, best first', () => {
    const [first, second] = report.ctas;
    expect(first).toMatchObject({ id: 'how-cta', visits: 1, taps: 1, previews: 1, paid: 1 });
    expect(second).toMatchObject({ id: 'hero-card', previews: 1, paid: 0 });
    expect(report.ctas.find((row) => row.id === 'try-cta')).toMatchObject({
      visits: 1,
      previews: 0,
    });
  });

  it('groups by source, device and campaign, keeping the first source', () => {
    expect(report.sources).toEqual([
      { key: 'google-ads', visits: 1, previews: 1, paid: 1 },
      { key: 'instagram', visits: 1, previews: 0, paid: 0 },
      { key: 'direct', visits: 1, previews: 1, paid: 0 },
    ]);
    expect(report.devices.map((row) => [row.key, row.visits])).toEqual([
      ['phone', 2],
      ['desktop', 1],
    ]);
    expect(report.campaigns).toEqual([{ key: 'search-core', visits: 1, previews: 1, paid: 1 }]);
  });

  it('is empty with no beacons', () => {
    const empty = buildVisitReport([], () => false);
    expect(empty.visits).toBe(0);
    expect(empty.sections.every((row) => row.seenPercent === 0)).toBe(true);
    expect(empty.sources).toEqual([]);
  });
});

describe('visitRangeFrom', () => {
  it('reads ?days=, and falls back to 7 days', () => {
    expect(visitRangeFrom('30').days).toBe(30);
    expect(visitRangeFrom(['1']).days).toBe(2);
    expect(visitRangeFrom('99').days).toBe(7);
    expect(visitRangeFrom(undefined).days).toBe(7);
  });
});
