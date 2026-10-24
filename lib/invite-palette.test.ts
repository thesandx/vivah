import { describe, expect, it } from 'vitest';

import { drawableInLatinFonts } from '@/lib/invite-palette';

describe('drawableInLatinFonts', () => {
  it('accepts Latin names and refuses other scripts', () => {
    expect(drawableInLatinFonts("Neha ji & D'Souza")).toBe(true);
    expect(drawableInLatinFonts('Zoë')).toBe(true);
    expect(drawableInLatinFonts('कार्तिक')).toBe(false);
  });
});
