import { describe, expect, it } from 'vitest';

import { welcomeMessage } from '@/lib/welcome-message';

describe('welcomeMessage', () => {
  const text = welcomeMessage({
    bride: 'Riya',
    groom: 'Aman',
    slug: 'riya-aman',
    phoneE164: '+919876543210',
    origin: 'https://vivah.online',
  });

  it('greets the couple and links their live site', () => {
    expect(text).toContain('Congratulations Riya & Aman');
    expect(text).toContain('https://riya-aman.vivah.online');
  });

  it('names the dashboard, the sign-in number, the help page and support', () => {
    expect(text).toContain('https://vivah.online/dashboard');
    expect(text).toContain('+91 98765 43210');
    expect(text).toContain('https://vivah.online/help');
    expect(text).toContain('support@vivah.online');
  });

  it('builds the site from the origin host, port included', () => {
    expect(
      welcomeMessage({
        bride: 'A',
        groom: 'B',
        slug: 'a-b',
        phoneE164: '+919876543210',
        origin: 'http://localhost:3000',
      }),
    ).toContain('https://a-b.localhost:3000');
  });
});
