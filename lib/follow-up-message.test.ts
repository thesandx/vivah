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
    expect(text).toContain('bahut pyaara ban raha hai: alisha-sumit.vivah.online 💛');
  });

  it('lets them stop the messages, asks one question and offers help', () => {
    expect(text).toContain('"done" likh dijiye');
    expect(text).toContain('Invites kab tak bhejne ka plan hai?');
    expect(text).toContain('Main Anushka, Team Vivah se.');
    expect(text).toContain('aur personal bana sakti hoon');
  });

  it('links the site and the sample invite, never the preview, and offers no call', () => {
    expect(text).toContain('https://priya-rahul.vivah.online/Neha');
    expect(text).not.toContain('/p/');
    expect(text.toLowerCase()).not.toContain('call');
    expect(text.endsWith('Apna banaiye: https://vivah.online\n\nAnushka, Team Vivah 💛')).toBe(
      true,
    );
  });

  it('leaves out the address when the couple chose none', () => {
    expect(
      followUpMessage({ bride: 'Alisha', groom: 'Sumit', rootDomain: 'vivah.online' }),
    ).toContain('bahut pyaara ban raha hai 💛');
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
