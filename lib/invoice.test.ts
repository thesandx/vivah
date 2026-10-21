import { describe, expect, it } from 'vitest';

import {
  invoiceAmount,
  invoiceDate,
  invoiceFileName,
  type InvoiceInput,
  invoiceNumber,
  invoicePdf,
  parseIssuerLines,
} from '@/lib/invoice';

const INPUT: InvoiceInput = {
  paymentId: 'Ab12Cd34Ef56Gh78Ij90',
  // 21 Oct 2026, 4:00 am IST: still 20 Oct in UTC.
  paidAt: new Date('2026-10-20T22:30:00Z'),
  amountRupees: 1499,
  providerName: 'Razorpay',
  providerPaymentId: 'pay_RxYz123',
  test: false,
  bride: 'Radha',
  groom: 'Shyam',
  phone: '+91 79838 73235',
  siteAddress: 'radha-shyam.vivah.online',
  issuerLines: ['Example Digital Services', '12 Example Road'],
};

function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe('invoiceNumber', () => {
  it('uses the India date and the start of the payment id', () => {
    expect(invoiceNumber(INPUT.paymentId, INPUT.paidAt)).toBe('VIV-20261021-AB12CD');
  });
});

describe('formatting', () => {
  it('writes the date in India time', () => {
    expect(invoiceDate(INPUT.paidAt)).toBe('21 Oct 2026');
  });

  it('writes rupees with Indian grouping and paise', () => {
    expect(invoiceAmount(499)).toBe('Rs. 499.00');
    expect(invoiceAmount(150000)).toBe('Rs. 1,50,000.00');
  });

  it('names the file after the address and the number', () => {
    expect(invoiceFileName('radha-shyam', 'VIV-20261021-AB12CD')).toBe(
      'vivah-invoice-radha-shyam-VIV-20261021-AB12CD.pdf',
    );
  });
});

describe('parseIssuerLines', () => {
  it('splits at | and drops empty lines', () => {
    expect(parseIssuerLines(' Example Services | 12 Road || Delhi ')).toEqual([
      'Example Services',
      '12 Road',
      'Delhi',
    ]);
  });

  it('gives nothing for an empty value', () => {
    expect(parseIssuerLines('')).toEqual([]);
  });
});

describe('invoicePdf', () => {
  const pdf = text(invoicePdf(INPUT));

  it('prints the couple, the item, the amount and the seller', () => {
    for (const expected of [
      '(INVOICE)',
      '(VIV-20261021-AB12CD)',
      '(Radha & Shyam)',
      '(+91 79838 73235)',
      '(Wedding invitation website)',
      '(radha-shyam.vivah.online - one-time payment)',
      '(Rs. 1,499.00)',
      '(pay_RxYz123)',
      '(Example Digital Services)',
      '(12 Example Road)',
    ]) {
      expect(pdf).toContain(expected);
    }
  });

  it('says that no GST is charged', () => {
    expect(pdf).toContain('not registered under GST, so no GST is charged');
  });

  it('names the brand when no seller is set', () => {
    expect(text(invoicePdf({ ...INPUT, issuerLines: [] }))).toContain('(vivah.online) Tj');
  });

  it('marks a test payment, and only a test payment', () => {
    expect(pdf).not.toContain('TEST PAYMENT');
    expect(text(invoicePdf({ ...INPUT, test: true }))).toContain('TEST PAYMENT');
  });

  it('leaves out the payment id line when the provider gave none', () => {
    expect(text(invoicePdf({ ...INPUT, providerPaymentId: null }))).not.toContain('(Payment ID)');
  });
});
