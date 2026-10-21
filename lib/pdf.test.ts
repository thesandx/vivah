import { describe, expect, it } from 'vitest';

import { pdfSafeText, renderPdf, textWidth } from '@/lib/pdf';

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe('pdfSafeText', () => {
  it('keeps printable ASCII as it is', () => {
    expect(pdfSafeText('Radha & Shyam (Delhi) 100%')).toBe('Radha & Shyam (Delhi) 100%');
  });

  it('gives known symbols a stand-in and drops accents', () => {
    expect(pdfSafeText('₹499 — “Café”')).toBe('Rs. 499 - "Cafe"');
  });

  it('marks a character the fonts lack with ?', () => {
    expect(pdfSafeText('राधा')).toMatch(/^\?+$/);
  });
});

describe('textWidth', () => {
  it('measures Helvetica, and bold is wider', () => {
    expect(textWidth('0000', 10)).toBeCloseTo(22.24);
    expect(textWidth('Amount', 10, true)).toBeGreaterThan(textWidth('Amount', 10));
  });
});

describe('renderPdf', () => {
  const pdf = text(
    renderPdf(
      [
        { kind: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#d62e55' },
        { kind: 'line', x1: 0, y1: 0, x2: 10, y2: 10, color: '#000000', width: 1 },
        { kind: 'text', x: 100, y: 100, size: 10, text: 'Total (paid) \\ ok', bold: true },
        { kind: 'text', x: 200, y: 100, size: 10, text: '0000', align: 'right' },
      ],
      'Invoice VIV-1',
    ),
  );

  it('is a PDF with a header and an end marker', () => {
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true);
    expect(pdf.endsWith('%%EOF\n')).toBe(true);
  });

  it('escapes brackets and backslashes in text', () => {
    expect(pdf).toContain('(Total \\(paid\\) \\\\ ok) Tj');
  });

  it('places right-aligned text so it ends at x', () => {
    expect(pdf).toContain('177.76 100 Td (0000)');
  });

  it('points every cross-reference entry at its object', () => {
    const xref = Number(/startxref\n(\d+)\n/.exec(pdf)?.[1]);
    expect(pdf.slice(xref, xref + 4)).toBe('xref');
    const offsets = [...pdf.slice(xref).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(offsets).toHaveLength(7);
    offsets.forEach((offset, index) => {
      expect(pdf.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true);
    });
  });

  it('gives the content stream its exact length', () => {
    const length = Number(/\/Length (\d+) >>\nstream\n/.exec(pdf)?.[1]);
    const start = pdf.indexOf('stream\n') + 'stream\n'.length;
    expect(pdf.slice(start + length, start + length + 10)).toBe('\nendstream');
  });

  it('refuses a colour that is not #rrggbb', () => {
    expect(() =>
      renderPdf([{ kind: 'rect', x: 0, y: 0, width: 1, height: 1, fill: 'red' }], 'x'),
    ).toThrow(/colour/);
  });
});
