import { describe, expect, it } from 'vitest';

import {
  FROM_ADMIN_MARK,
  FROM_DASHBOARD_MARK,
  inviteBeaconSchema,
  isInviteSeen,
  nextSeen,
  withInviteMark,
} from '@/lib/invite-tracking';

describe('nextSeen', () => {
  it('counts a browser as a guest unless a mark says otherwise', () => {
    expect(nextSeen(null, '')).toBe('guest');
    expect(nextSeen('guest', 'anything')).toBe('guest');
  });

  it('makes the admin browser quiet for good', () => {
    expect(nextSeen(null, FROM_ADMIN_MARK)).toBe('admin');
    expect(nextSeen('admin', '')).toBe('admin');
    expect(nextSeen('admin', FROM_DASHBOARD_MARK)).toBe('admin');
  });

  it('remembers the couple', () => {
    expect(nextSeen('guest', FROM_DASHBOARD_MARK)).toBe('couple');
    expect(nextSeen('couple', '')).toBe('couple');
    expect(nextSeen('couple', FROM_ADMIN_MARK)).toBe('admin');
  });
});

describe('withInviteMark', () => {
  it('adds the mark and replaces an old one', () => {
    expect(withInviteMark('https://priya-rahul.vivah.online', FROM_ADMIN_MARK)).toBe(
      'https://priya-rahul.vivah.online#from-admin',
    );
    expect(withInviteMark('/site/a#x', FROM_DASHBOARD_MARK)).toBe('/site/a#from-dashboard');
  });
});

describe('isInviteSeen', () => {
  it('accepts only the fixed words', () => {
    expect(isInviteSeen('guest')).toBe(true);
    expect(isInviteSeen('Neha')).toBe(false);
    expect(isInviteSeen(null)).toBe(false);
  });
});

describe('inviteBeaconSchema', () => {
  const beacon = {
    weddingId: 'AbCdEfGhIjKlMnOpQrSt',
    viewId: '3f2b8c1e-4a5d-4e6f-8a9b-0c1d2e3f4a5b',
    event: 'rsvp-tapped',
    device: 'desktop',
    viewer: 'couple',
    firstVisit: false,
  };

  it('accepts a beacon with or without a guest link', () => {
    expect(inviteBeaconSchema.safeParse(beacon).success).toBe(true);
    expect(inviteBeaconSchema.safeParse({ ...beacon, guestLinkId: 'f'.repeat(64) }).success).toBe(
      true,
    );
  });

  it('refuses a name, an unknown key or an admin viewer', () => {
    expect(inviteBeaconSchema.safeParse({ ...beacon, guestLinkId: 'Neha' }).success).toBe(false);
    expect(inviteBeaconSchema.safeParse({ ...beacon, name: 'Neha' }).success).toBe(false);
    expect(inviteBeaconSchema.safeParse({ ...beacon, viewer: 'admin' }).success).toBe(false);
  });
});
