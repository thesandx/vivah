import { BUSINESS } from '@/lib/business';
import { A4, type PdfOp, renderPdf } from '@/lib/pdf';

/**
 * The invoice the admin downloads for a paid invite, as a one-page PDF. Pure:
 * the route reads the payment and hands its facts in.
 *
 * The seller is not registered under GST, so this is a plain invoice: no
 * GSTIN, no tax line, and a sentence that says no GST is charged. When the
 * business registers, the tax lines go here.
 *
 * The seller's legal name and address come from `INVOICE_ISSUER`, a GitHub
 * variable, so they stay out of this public repository. Unset, the invoice
 * names the brand only.
 */

export interface InvoiceInput {
  /** Our `payments` document id. */
  paymentId: string;
  paidAt: Date;
  amountRupees: number;
  /** As the customer saw it: `Razorpay` or `Cashfree`. */
  providerName: string;
  /** The provider's id for the payment (`pay_...` or Cashfree's order id), when known. */
  providerPaymentId: string | null;
  /** A payment in the provider's test account. The invoice says so in red. */
  test: boolean;
  bride: string;
  groom: string;
  /** Already formatted for display: `+91 98765 43210`. */
  phone: string;
  /** `radha-shyam.vivah.online`. */
  siteAddress: string;
  /** The seller's legal name, address and registration lines, top to bottom. */
  issuerLines: readonly string[];
}

const IST = 'Asia/Kolkata';

/** `VIV-20261021-AB12CD`: the IST date it was paid, then the start of the payment id. */
export function invoiceNumber(paymentId: string, paidAt: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(paidAt);
  const part = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return `VIV-${part('year')}${part('month')}${part('day')}-${paymentId.slice(0, 6).toUpperCase()}`;
}

/** `21 Oct 2026`, in India time. */
export function invoiceDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** `Rs. 1,499.00`. The PDF fonts have no rupee sign. */
export function invoiceAmount(rupees: number): string {
  const figure = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
  return `Rs. ${figure}`;
}

/** The file name the browser saves: `vivah-invoice-radha-shyam-VIV-20261021-AB12CD.pdf`. */
export function invoiceFileName(slug: string, number: string): string {
  return `vivah-invoice-${slug}-${number}.pdf`;
}

/**
 * Parses `INVOICE_ISSUER`: the seller's lines, separated by `|`. Commas are
 * fine inside a line in code, but the Cloud Run deploy action splits on them,
 * so the variable uses `|` only.
 */
export function parseIssuerLines(value: string): string[] {
  return value
    .split('|')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .slice(0, 6);
}

// The site's tokens, as the PDF needs them: brand, ink, ink-soft, line, brand-soft.
const BRAND = '#d62e55';
const INK = '#3d1f2e';
const SOFT = '#82596b';
const LINE = '#e6d6dd';
const BAND = '#ffe6ee';
const WARN = '#b01f45';

const LEFT = 50;
const RIGHT = A4.width - 50;

/** The invoice as PDF bytes. */
export function invoicePdf(input: InvoiceInput): Uint8Array<ArrayBuffer> {
  const number = invoiceNumber(input.paymentId, input.paidAt);
  const issuer = input.issuerLines.length > 0 ? input.issuerLines : [BUSINESS.brand];
  const ops: PdfOp[] = [];
  const text = (
    x: number,
    y: number,
    value: string,
    size: number,
    options: { bold?: boolean; color?: string; align?: 'left' | 'right' } = {},
  ): void => {
    ops.push({ kind: 'text', x, y, text: value, size, ...options, color: options.color ?? INK });
  };

  // Header: the brand on the left, the document's name on the right.
  ops.push({ kind: 'rect', x: 0, y: A4.height - 8, width: A4.width, height: 8, fill: BRAND });
  text(LEFT, 780, BUSINESS.brand, 22, { bold: true, color: BRAND });
  text(RIGHT, 780, 'INVOICE', 22, { bold: true, align: 'right' });
  if (input.test) {
    text(RIGHT, 762, 'TEST PAYMENT - NOT A REAL SALE', 9, {
      bold: true,
      color: WARN,
      align: 'right',
    });
  }

  // The seller, under the brand.
  let y = 752;
  issuer.forEach((line, index) => {
    text(LEFT, y, line, index === 0 ? 10 : 9, {
      bold: index === 0,
      color: index === 0 ? INK : SOFT,
    });
    y -= 13;
  });
  text(LEFT, y, BUSINESS.email, 9, { color: SOFT });

  // The invoice's facts, on the right.
  const facts: [string, string][] = [
    ['Invoice no.', number],
    ['Invoice date', invoiceDate(input.paidAt)],
    ['Paid via', input.providerName],
  ];
  if (input.providerPaymentId !== null) facts.push(['Payment ID', input.providerPaymentId]);
  let factY = 740;
  for (const [label, value] of facts) {
    text(RIGHT - 200, factY, label, 9, { color: SOFT });
    text(RIGHT, factY, value, 9, { bold: true, align: 'right' });
    factY -= 15;
  }

  // Billed to.
  const top = Math.min(y, factY) - 30;
  ops.push({ kind: 'line', x1: LEFT, y1: top, x2: RIGHT, y2: top, color: LINE, width: 1 });
  text(LEFT, top - 22, 'BILLED TO', 8, { bold: true, color: SOFT });
  text(LEFT, top - 40, `${input.bride} & ${input.groom}`, 12, { bold: true });
  text(LEFT, top - 56, input.phone, 10, { color: SOFT });

  // The one line item.
  const table = top - 92;
  ops.push({ kind: 'rect', x: LEFT, y: table - 8, width: RIGHT - LEFT, height: 24, fill: BAND });
  text(LEFT + 10, table, 'Description', 9, { bold: true });
  text(RIGHT - 120, table, 'Qty', 9, { bold: true, align: 'right' });
  text(RIGHT - 10, table, 'Amount', 9, { bold: true, align: 'right' });

  const row = table - 32;
  text(LEFT + 10, row, 'Wedding invitation website', 11, { bold: true });
  text(LEFT + 10, row - 15, `${input.siteAddress} - one-time payment`, 9, { color: SOFT });
  text(RIGHT - 120, row, '1', 11, { align: 'right' });
  text(RIGHT - 10, row, invoiceAmount(input.amountRupees), 11, { align: 'right' });
  const rule = row - 32;
  ops.push({ kind: 'line', x1: LEFT, y1: rule, x2: RIGHT, y2: rule, color: LINE, width: 1 });

  // Totals.
  text(RIGHT - 120, rule - 22, 'Subtotal', 10, { color: SOFT, align: 'right' });
  text(RIGHT - 10, rule - 22, invoiceAmount(input.amountRupees), 10, { align: 'right' });
  ops.push({
    kind: 'rect',
    x: RIGHT - 230,
    y: rule - 60,
    width: 230,
    height: 26,
    fill: BAND,
  });
  text(RIGHT - 120, rule - 51, 'Total paid', 11, { bold: true, align: 'right' });
  text(RIGHT - 10, rule - 51, invoiceAmount(input.amountRupees), 12, {
    bold: true,
    color: BRAND,
    align: 'right',
  });

  // Notes.
  let note = rule - 100;
  for (const line of [
    `Paid in full on ${invoiceDate(input.paidAt)} through ${input.providerName}.`,
    'The seller is not registered under GST, so no GST is charged on this invoice.',
    `Questions about this invoice: ${BUSINESS.email}`,
  ]) {
    text(LEFT, note, line, 9, { color: SOFT });
    note -= 14;
  }

  // Footer.
  ops.push({ kind: 'line', x1: LEFT, y1: 70, x2: RIGHT, y2: 70, color: LINE, width: 1 });
  text(LEFT, 52, 'Thank you for choosing vivah.online. Wishing you a beautiful wedding.', 9, {
    color: SOFT,
  });
  text(RIGHT, 52, number, 8, { color: SOFT, align: 'right' });

  return renderPdf(ops, `Invoice ${number}`);
}
