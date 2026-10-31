import { describe, expect, it } from 'vitest';

import { followUpMessage } from '@/lib/follow-up-message';

describe('followUpMessage', () => {
  const text = followUpMessage({
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
      followUpMessage({ bride: 'Alisha', groom: 'Sumit', nameOrder: 'groom-first', link: 'x' }),
    ).toContain('Namaste Sumit & Alisha');
  });
});
