import { describe, expect, it } from 'vitest';

import { followUpMessage } from '@/lib/follow-up-message';

describe('followUpMessage', () => {
  const text = followUpMessage({
    bride: 'Alisha',
    groom: 'Sumit',
    slug: 'alisha-sumit',
    rootDomain: 'vivah.online',
  });

  it('greets the couple by name and names their chosen address', () => {
    expect(text.startsWith('Namaste Alisha ji & Sumit ji 🙏')).toBe(true);
    expect(text).toContain('invite banaya tha: alisha-sumit.vivah.online 💛');
  });

  it('lets them stop the messages, asks one question and offers help', () => {
    expect(text).toContain('"done" likh dijiye');
    expect(text).toContain('invites kab tak bhejne ka plan hai?');
    expect(text).toContain('Hum bechne nahi, help karne ke liye hain.');
  });

  it('links the site and the sample invite, never the preview, and offers no call', () => {
    expect(text).toContain('Website: https://vivah.online');
    expect(text).not.toContain('/p/');
    expect(text.toLowerCase()).not.toContain('call');
    expect(text.endsWith('https://priya-rahul.vivah.online/Neha\n\nTeam Vivah 💛')).toBe(true);
  });

  it('leaves out the address when the couple chose none', () => {
    expect(
      followUpMessage({ bride: 'Alisha', groom: 'Sumit', rootDomain: 'vivah.online' }),
    ).toContain('invite banaya tha 💛');
  });

  it('follows the name order', () => {
    expect(
      followUpMessage({
        bride: 'Alisha',
        groom: 'Sumit',
        nameOrder: 'groom-first',
        rootDomain: 'vivah.online',
      }),
    ).toContain('Namaste Sumit ji & Alisha ji');
  });
});
