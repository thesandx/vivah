import { describe, expect, it } from 'vitest';

import {
  NUDGE_DAYS,
  NUDGE_TOPICS,
  nudgeLabel,
  type NudgeLead,
  nudgeMessage,
  nudgeStatus,
  openAgainMessage,
} from '@/lib/preview-nudges';

// 22 Oct 2026, 10:00 in India.
const NOW = new Date('2026-10-22T04:30:00Z');

function lead(overrides: Partial<NudgeLead>): NudgeLead {
  return {
    status: 'opened',
    createdAt: new Date('2026-10-21T17:00:00Z'), // 21 Oct, 22:30 in India
    deletedAt: null,
    weddingDate: null,
    ...overrides,
  };
}

const INPUT = {
  bride: 'Alisha',
  groom: 'Sumit',
  link: 'https://vivah.online/p/abc',
  rootDomain: 'vivah.online',
};

describe('nudgeStatus', () => {
  it('counts calendar days in India from the day the couple asked', () => {
    expect(nudgeStatus(lead({}), NOW)).toEqual({ kind: 'due', day: 1 });
    // 21 Oct 19:00 UTC is already 22 Oct in India: the same day, so no nudge yet.
    expect(nudgeStatus(lead({ createdAt: new Date('2026-10-21T19:00:00Z') }), NOW)).toEqual({
      kind: 'starts',
    });
  });

  it('runs to day 7, then stops', () => {
    expect(nudgeStatus(lead({ createdAt: new Date('2026-10-15T06:00:00Z') }), NOW)).toEqual({
      kind: 'due',
      day: 7,
    });
    expect(nudgeStatus(lead({ createdAt: new Date('2026-10-14T06:00:00Z') }), NOW)).toEqual({
      kind: 'none',
      reason: 'finished',
    });
  });

  it('never nudges a paid or deleted preview', () => {
    expect(nudgeStatus(lead({ status: 'paid' }), NOW)).toEqual({ kind: 'none', reason: 'paid' });
    expect(nudgeStatus(lead({ deletedAt: NOW }), NOW)).toEqual({ kind: 'none', reason: 'deleted' });
  });

  it('stops on the wedding day', () => {
    expect(nudgeStatus(lead({ weddingDate: '2026-10-22' }), NOW)).toEqual({
      kind: 'none',
      reason: 'wedding-passed',
    });
    expect(nudgeStatus(lead({ weddingDate: '2026-12-01' }), NOW)).toEqual({ kind: 'due', day: 1 });
  });
});

describe('nudgeLabel', () => {
  it('says which day is due', () => {
    expect(nudgeLabel({ kind: 'due', day: 3 })).toBe('Nudge due · Day 3 of 7');
    expect(nudgeLabel({ kind: 'starts' })).toBe('First nudge tomorrow');
    expect(nudgeLabel({ kind: 'none', reason: 'finished' })).toBe('Nudges done');
    expect(nudgeLabel({ kind: 'none', reason: 'paid' })).toBeNull();
  });
});

describe('nudgeMessage', () => {
  it('has a topic and a message for every day, each ending with the link', () => {
    expect(NUDGE_TOPICS).toHaveLength(NUDGE_DAYS);
    for (let day = 1; day <= NUDGE_DAYS; day += 1) {
      const message = nudgeMessage(day, INPUT);
      expect(message.startsWith('Namaste Alisha & Sumit 🙏')).toBe(true);
      expect(message.toLowerCase()).toContain('reply "open"');
      expect(message).toContain('Team Vivah 💛');
      expect(message.endsWith('\n\nhttps://vivah.online/p/abc')).toBe(true);
    }
  });

  it('names the couple’s likely address on day 6', () => {
    expect(nudgeMessage(6, INPUT)).toContain('alisha-sumit.vivah.online is still free');
    expect(nudgeMessage(6, { ...INPUT, bride: 'राधा', groom: 'श्याम' })).toContain(
      'Your own vivah.online address is still free',
    );
  });

  it('refuses a day outside the week', () => {
    expect(() => nudgeMessage(0, INPUT)).toThrow('No nudge for day 0');
    expect(() => nudgeMessage(8, INPUT)).toThrow('No nudge for day 8');
  });
});

describe('openAgainMessage', () => {
  it('says the preview is open for 30 minutes and ends with the link', () => {
    const message = openAgainMessage(INPUT);
    expect(message).toContain('Your invite is open again 💌 It stays open for 30 minutes.');
    expect(message).toContain('Pay and make it yours');
    expect(message.endsWith('\n\nhttps://vivah.online/p/abc')).toBe(true);
  });
});
