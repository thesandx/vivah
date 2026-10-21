/**
 * A one-page PDF writer: text in Helvetica, filled rectangles and lines. It
 * covers what the admin's invoice needs and nothing more, so no PDF library
 * ships in the image. Pure, so every byte is tested without a browser.
 *
 * Text uses the PDF standard fonts with WinAnsi encoding, so no font file is
 * embedded. Those fonts have no Devanagari and no rupee sign: `pdfSafeText`
 * turns anything outside printable ASCII into a plain stand-in.
 *
 * Coordinates are PDF points from the bottom-left corner. A4 is 595 x 842.
 */

export const A4 = { width: 595, height: 842 } as const;

/** `#rrggbb`. */
export type PdfColor = string;

export type PdfOp =
  | {
      kind: 'text';
      x: number;
      y: number;
      size: number;
      text: string;
      bold?: boolean;
      color?: PdfColor;
      /** `right` puts the END of the text at `x`. */
      align?: 'left' | 'right';
    }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; fill: PdfColor }
  | {
      kind: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: PdfColor;
      width: number;
    };

/*
 * Glyph widths of Helvetica and Helvetica-Bold for ASCII 32 to 126, in
 * thousandths of the font size, from Adobe's AFM files. Right-aligned text
 * needs them; the PDF viewer has its own copy for drawing.
 */
const REGULAR_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667,
  611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500,
  222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556,
  556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667,
  611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667,
  667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556,
  278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

/** Stand-ins for the characters people type that the standard fonts lack. */
const REPLACEMENTS: Record<string, string> = {
  '₹': 'Rs. ',
  '‘': "'",
  '’': "'",
  '“': '"',
  '”': '"',
  '–': '-',
  '—': '-',
  '·': '-',
  '…': '...',
  ' ': ' ',
};

/**
 * Text the standard fonts can draw: printable ASCII only. Accents are
 * dropped (`é` → `e`), known symbols get a stand-in, and anything else
 * becomes `?`, so a name in another script still shows that something was
 * there.
 */
export function pdfSafeText(text: string): string {
  let out = '';
  for (const char of text.normalize('NFKD')) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 32 && code <= 126) out += char;
    else if (/\p{M}/u.test(char)) continue;
    else if (char === '\n' || char === '\t') out += ' ';
    else out += REPLACEMENTS[char] ?? '?';
  }
  return out;
}

/** The width of `text` in points, at `size`, after `pdfSafeText`. */
export function textWidth(text: string, size: number, bold = false): number {
  const widths = bold ? BOLD_WIDTHS : REGULAR_WIDTHS;
  let units = 0;
  for (const char of pdfSafeText(text)) units += widths[char.charCodeAt(0) - 32] ?? 556;
  return (units * size) / 1000;
}

function escapeString(text: string): string {
  return text.replace(/[\\()]/g, (char) => `\\${char}`);
}

/** Two decimals at most, no trailing zeros: what a content stream needs. */
function num(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function rgb(color: PdfColor): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (match === null) throw new Error(`Not a #rrggbb colour: "${color}"`);
  return match
    .slice(1)
    .map((hex) => num(parseInt(hex, 16) / 255))
    .join(' ');
}

function contentStream(ops: readonly PdfOp[]): string {
  const lines: string[] = [];
  for (const op of ops) {
    if (op.kind === 'rect') {
      lines.push(
        `${rgb(op.fill)} rg ${num(op.x)} ${num(op.y)} ${num(op.width)} ${num(op.height)} re f`,
      );
    } else if (op.kind === 'line') {
      lines.push(
        `${rgb(op.color)} RG ${num(op.width)} w ${num(op.x1)} ${num(op.y1)} m ${num(op.x2)} ${num(op.y2)} l S`,
      );
    } else {
      const text = pdfSafeText(op.text);
      const bold = op.bold === true;
      const x = op.align === 'right' ? op.x - textWidth(text, op.size, bold) : op.x;
      lines.push(
        `BT ${rgb(op.color ?? '#000000')} rg /${bold ? 'F2' : 'F1'} ${num(op.size)} Tf ${num(x)} ${num(op.y)} Td (${escapeString(text)}) Tj ET`,
      );
    }
  }
  return lines.join('\n');
}

/**
 * One A4 page with `ops` drawn on it, as the bytes of a PDF file. `title`
 * goes in the document info, which a viewer shows as the window title.
 */
export function renderPdf(ops: readonly PdfOp[], title: string): Uint8Array<ArrayBuffer> {
  const stream = contentStream(ops);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Title (${escapeString(pdfSafeText(title))}) /Producer (vivah.online) >>`,
  ];

  // Every character is ASCII, so a string's length is its length in bytes,
  // and the cross-reference offsets below are exact.
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}
