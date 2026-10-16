import { describe, expect, it } from 'vitest';

import {
  inviteDescription,
  inviteMetadata,
  inviteOrigin,
  inviteTitle,
  ogImageUrl,
} from '@/lib/invite-meta';

const base = {
  slug: 'sara',
  bride: 'Sara',
  groom: 'Kabir',
  weddingDate: '2026-03-09',
  guestName: null,
  rootDomain: 'vivah.online',
  appUrl: 'https://app.example',
};

describe('invite link preview', () => {
  it('titles the invite with the names and the short date', () => {
    expect(inviteTitle('Sara', 'Kabir', '2026-03-09')).toBe(
      "Sara & Kabir's Wedding Invitation | 9 March",
    );
    expect(inviteTitle('Sara', 'Kabir', null)).toBe("Sara & Kabir's Wedding Invitation");
  });

  it('greets the guest in the description', () => {
    expect(inviteDescription('Sara', 'Kabir', '2026-03-09', 'Kartheek')).toBe(
      'Hi Kartheek, you are invited to the wedding of Sara and Kabir on Monday, 9 March 2026.',
    );
    expect(inviteDescription('Sara', 'Kabir', null, null)).toBe(
      'You are invited to the wedding of Sara and Kabir.',
    );
  });

  it('uses the couple host, or the internal path without routing', () => {
    expect(inviteOrigin('sara', 'vivah.online', 'https://app.example')).toBe(
      'https://sara.vivah.online',
    );
    expect(inviteOrigin('sara', '', 'http://localhost:3000/')).toBe(
      'http://localhost:3000/site/sara',
    );
  });

  it('points the image at the OG route with the guest name', () => {
    expect(ogImageUrl({ ...base, guestName: 'Kartheek ji' })).toBe(
      'https://sara.vivah.online/api/og/sara?guest=Kartheek%20ji',
    );
    expect(ogImageUrl({ ...base, rootDomain: '' })).toBe('https://app.example/api/og/sara');
  });

  it('builds a large image card, and hides guest pages from search', () => {
    const plain = inviteMetadata(base);
    expect(plain.twitter).toMatchObject({ card: 'summary_large_image' });
    expect(plain.openGraph).toMatchObject({ url: 'https://sara.vivah.online' });
    expect(plain.robots).toBeUndefined();

    const guest = inviteMetadata({ ...base, guestName: 'Kartheek ji' });
    expect(guest.openGraph).toMatchObject({
      url: 'https://sara.vivah.online/Kartheek-ji',
      images: [{ width: 1080, height: 1350 }],
    });
    expect(guest.description).toMatch(/^Hi Kartheek ji, /);
    expect(guest.robots).toEqual({ index: false, follow: false });
  });

  it('keeps the shared segment in the URL of a numbered guest link', () => {
    const second = inviteMetadata({ ...base, guestName: 'Rahul', guestSegment: 'Rahul-2' });
    expect(second.openGraph).toMatchObject({ url: 'https://sara.vivah.online/Rahul-2' });
  });
});
