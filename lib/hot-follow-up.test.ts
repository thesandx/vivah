import { describe, expect, it } from 'vitest';

import {
  formatMinutes,
  HOT_AFTER_MINUTES,
  hotFollowUpAt,
  hotFollowUpMessage,
  hotLabel,
  type HotLead,
  hotStatus,
} from '@/lib/hot-follow-up';

const CREATED = new Date('2026-10-29T08:00:00Z');

function lead(overrides: Partial<HotLead>): HotLead {
  return { status: 'opened', createdAt: CREATED, deletedAt: null, ...overrides };
}

function minutesAfter(minutes: number): Date {
  return new Date(CREATED.getTime() + minutes * 60_000);
}

describe('hotStatus', () => {
  it('waits for the first 10 minutes', () => {
    expect(hotStatus(lead({}), minutesAfter(3))).toEqual({ kind: 'soon', minutesLeft: 7 });
    expect(hotStatus(lead({}), minutesAfter(9.9))).toEqual({ kind: 'soon', minutesLeft: 1 });
  });

  it('is hot from 10 minutes until 6 hours', () => {
    expect(hotStatus(lead({}), minutesAfter(HOT_AFTER_MINUTES))).toEqual({
      kind: 'hot',
      minutesSince: 10,
    });
    expect(hotStatus(lead({}), minutesAfter(359))).toEqual({ kind: 'hot', minutesSince: 359 });
    expect(hotStatus(lead({}), minutesAfter(360))).toEqual({ kind: 'none', reason: 'passed' });
  });

  it('is never hot once paid or deleted', () => {
    expect(hotStatus(lead({ status: 'paid' }), minutesAfter(20))).toEqual({
      kind: 'none',
      reason: 'paid',
    });
    expect(hotStatus(lead({ deletedAt: minutesAfter(15) }), minutesAfter(20))).toEqual({
      kind: 'none',
      reason: 'deleted',
    });
  });
});

describe('hotFollowUpAt', () => {
  it('is 10 minutes after the preview', () => {
    expect(hotFollowUpAt(CREATED)).toEqual(minutesAfter(10));
  });
});

describe('hotLabel', () => {
  it('names the wait only while hot', () => {
    expect(hotLabel({ kind: 'hot', minutesSince: 25 })).toBe(
      'Not paid after 25 min · follow up now',
    );
    expect(hotLabel({ kind: 'soon', minutesLeft: 4 })).toBeNull();
    expect(hotLabel({ kind: 'none', reason: 'paid' })).toBeNull();
  });
});

describe('formatMinutes', () => {
  it('reads as minutes, then hours', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(125)).toBe('2 h 5 min');
  });
});

describe('hotFollowUpMessage', () => {
  const text = hotFollowUpMessage({
    bride: 'Alisha',
    groom: 'Sumit',
    link: 'https://vivah.online/p/abc',
  });

  it('greets the couple, asks for help or feedback, and links their own preview', () => {
    expect(text.startsWith('Namaste Alisha & Sumit 🙏')).toBe(true);
    expect(text).toContain('Kaisa laga?');
    expect(text).toContain('bata dijiye kyun');
    expect(text).toContain('aur time chahiye, toh bilkul theek hai');
    expect(text).toContain('https://vivah.online/p/abc');
  });

  it('ends with the sign-off, after the link', () => {
    expect(text.endsWith('https://vivah.online/p/abc\n\nTeam Vivah 💛')).toBe(true);
  });

  it('follows the name order', () => {
    expect(
      hotFollowUpMessage({ bride: 'Alisha', groom: 'Sumit', nameOrder: 'groom-first', link: 'x' }),
    ).toContain('Namaste Sumit & Alisha');
  });
});
