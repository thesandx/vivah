import { describe, expect, it } from 'vitest';

import { followUpMessage } from '@/lib/follow-up-message';

describe('followUpMessage', () => {
  const text = followUpMessage({
    bride: 'Alisha',
    groom: 'Sumit',
    slug: 'alisha-sumit',
    rootDomain: 'vivah.online',
  });

  it('greets the couple as Anushka and names their chosen address', () => {
    expect(text.startsWith('Namaste Alisha ji & Sumit ji 🙏\nMain Anushka, Team Vivah se.')).toBe(
      true,
    );
    expect(text).toContain('abhi tak live nahi kiya: alisha-sumit.vivah.online 💛');
  });

  it('offers help to make it live', () => {
    expect(text).toContain('main aapka invite live karne mein help kar dungi');
  });

  it('links the sample invite and the site, never the preview, and offers no call', () => {
    expect(text).toContain('Sample invite 👇\nhttps://priya-rahul.vivah.online/Neha');
    expect(text).not.toContain('/p/');
    expect(text.toLowerCase()).not.toContain('call');
    expect(
      text.endsWith('Apna yahan banaiye 👇\nhttps://vivah.online\n\nAnushka, Team Vivah 💛'),
    ).toBe(true);
  });

  it('leaves out the address when the couple chose none', () => {
    expect(
      followUpMessage({ bride: 'Alisha', groom: 'Sumit', rootDomain: 'vivah.online' }),
    ).toContain('abhi tak live nahi kiya 💛');
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
