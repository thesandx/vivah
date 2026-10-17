import { describe, expect, it } from 'vitest';

import {
  formatTimeLeft,
  PREVIEW_VIEW_SECONDS,
  previewClosed,
  previewClosesAt,
  timerStarted,
  viewEndsAtFrom,
} from '@/lib/preview-timer';

const at = (iso: string): Date => new Date(iso);
const NOW = at('2026-10-17T12:00:00Z');

describe('preview timer', () => {
  it('runs for 30 minutes from the first open', () => {
    expect(PREVIEW_VIEW_SECONDS).toBe(1800);
    expect(viewEndsAtFrom(NOW)).toEqual(at('2026-10-17T12:30:00Z'));
  });

  it('closes at the unopened link expiry until the timer starts', () => {
    const lead = { status: 'preview-sent', expiresAt: at('2026-10-19T12:00:00Z') };
    expect(timerStarted(lead)).toBe(false);
    expect(timerStarted({ ...lead, viewEndsAt: null })).toBe(false);
    expect(previewClosesAt(lead)).toEqual(lead.expiresAt);
    expect(previewClosed(lead, NOW)).toBe(false);
  });

  it('closes when the 30 minutes end, for everyone', () => {
    const lead = {
      status: 'opened',
      expiresAt: at('2026-10-19T12:00:00Z'),
      viewEndsAt: at('2026-10-17T12:00:00Z'),
    };
    expect(timerStarted(lead)).toBe(true);
    expect(previewClosed(lead, NOW)).toBe(true);
    expect(previewClosed(lead, at('2026-10-17T11:59:59Z'))).toBe(false);
  });

  it('never closes a paid lead', () => {
    const lead = {
      status: 'paid',
      expiresAt: at('2026-10-01T00:00:00Z'),
      viewEndsAt: at('2026-10-01T00:00:00Z'),
    };
    expect(previewClosesAt(lead)).toBeNull();
    expect(previewClosed(lead, NOW)).toBe(false);
  });

  it('formats the time left as minutes and seconds', () => {
    expect(formatTimeLeft(PREVIEW_VIEW_SECONDS * 1000)).toBe('30:00');
    expect(formatTimeLeft(65_000)).toBe('01:05');
    expect(formatTimeLeft(400)).toBe('00:01');
    expect(formatTimeLeft(-5000)).toBe('00:00');
  });
});
