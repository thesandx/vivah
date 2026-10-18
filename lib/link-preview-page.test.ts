import { describe, expect, it } from 'vitest';

import { escapeHtml, linkPreviewHtml } from '@/lib/link-preview-page';

const CARD = {
  title: `Radha & Shyam's Wedding Invitation`,
  description: 'Hi "Kartheek", you are invited.',
  url: 'https://radha-shyam.vivah.online/Kartheek',
  siteName: 'vivah.online',
  image: {
    url: 'https://radha-shyam.vivah.online/api/og/radha-shyam?guest=Kartheek',
    width: 1080,
    height: 1350,
    alt: 'Wedding invitation of Radha and Shyam',
  },
};

describe('linkPreviewHtml', () => {
  it('puts og:image near the top of a small page', () => {
    const html = linkPreviewHtml(CARD);
    expect(html.length).toBeLessThan(3000);
    expect(html.indexOf('og:image')).toBeLessThan(1500);
    expect(html).toContain(
      '<meta property="og:image" content="https://radha-shyam.vivah.online/api/og/radha-shyam?guest=Kartheek">',
    );
    expect(html).toContain('<meta property="og:image:height" content="1350">');
  });

  it('escapes names, so a name cannot break out of an attribute', () => {
    const html = linkPreviewHtml({ ...CARD, title: '"><script>x</script>' });
    expect(html).not.toContain('<script>');
    expect(escapeHtml(`a&b<c>"d'`)).toBe('a&amp;b&lt;c&gt;&quot;d&#39;');
  });
});
