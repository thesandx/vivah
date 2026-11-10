import { describe, expect, it } from 'vitest';

import { buildInviteVisitReport, indiaDay, type InviteBeaconRow } from '@/lib/invite-visit-report';

const NOW = new Date('2026-11-10T12:00:00Z');
const NEHA = 'a'.repeat(64);
const RAHUL = 'b'.repeat(64);
const LINKS = [
  { id: NEHA, name: 'Neha' },
  { id: RAHUL, name: 'Rahul' },
];

function row(overrides: Partial<InviteBeaconRow>): InviteBeaconRow {
  return {
    event: 'opened',
    viewer: 'guest',
    firstVisit: true,
    device: 'phone',
    createdAt: new Date('2026-11-10T06:00:00Z'),
    ...overrides,
  };
}

describe('buildInviteVisitReport', () => {
  it('counts opens, first-time visitors, taps and the couple apart', () => {
    const report = buildInviteVisitReport(
      [
        row({ guestLinkId: NEHA }),
        row({ guestLinkId: NEHA, firstVisit: false, createdAt: new Date('2026-11-10T08:00:00Z') }),
        row({ guestLinkId: NEHA, event: 'envelope-opened' }),
        row({ guestLinkId: NEHA, event: 'rsvp-tapped' }),
        row({ device: 'desktop', createdAt: new Date('2026-11-08T05:00:00Z') }),
        row({ guestLinkId: 'c'.repeat(64) }),
        row({ viewer: 'couple' }),
        row({ viewer: 'couple', event: 'rsvp-tapped' }),
      ],
      LINKS,
      NOW,
    );
    expect(report).toMatchObject({
      opens: 4,
      visitors: 3,
      envelopeOpens: 1,
      rsvpTaps: 1,
      coupleOpens: 1,
      devices: { phone: 3, tablet: 0, desktop: 1 },
      firstAt: new Date('2026-11-08T05:00:00Z'),
      lastAt: new Date('2026-11-10T08:00:00Z'),
      unopenedLinks: ['Rahul'],
    });
    expect(
      report.links.map((link) => [link.label, link.opens, link.visitors, link.rsvpTaps]),
    ).toEqual([
      ['Neha', 2, 1, 1],
      ['A deleted or hand-typed guest link', 1, 1, 0],
      ['Plain link (no guest name)', 1, 1, 0],
    ]);
    expect(report.days).toHaveLength(14);
    expect(report.days[0]).toEqual({ day: '2026-11-10', opens: 3, visitors: 2 });
    expect(report.days[2]).toEqual({ day: '2026-11-08', opens: 1, visitors: 1 });
  });

  it('reports nothing for no beacons', () => {
    const report = buildInviteVisitReport([], LINKS, NOW);
    expect(report.opens).toBe(0);
    expect(report.lastAt).toBeNull();
    expect(report.links).toEqual([]);
    expect(report.unopenedLinks).toEqual(['Neha', 'Rahul']);
  });
});

describe('indiaDay', () => {
  it('uses India time, so 8 PM UTC is the next day', () => {
    expect(indiaDay(new Date('2026-11-09T20:00:00Z'))).toBe('2026-11-10');
  });
});
