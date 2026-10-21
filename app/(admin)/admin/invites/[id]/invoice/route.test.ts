// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The invoice download, with the data layer mocked: what matters here is the
 * admin gate, the 404s and the PDF headers. `lib/invoice.test.ts` covers the
 * PDF itself.
 */

const env = { adminEnabled: true, rootDomain: 'vivah.online', invoiceIssuer: 'Example Services' };
vi.mock('@/lib/env', () => ({ env }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const getSession = vi.fn<() => Promise<unknown>>();
vi.mock('@/services/admin-session.service', () => ({ getAdminSession: () => getSession() }));

const getWedding = vi.fn<(id: string) => Promise<unknown>>();
const getPayment = vi.fn<(wedding: unknown) => Promise<unknown>>();
vi.mock('@/services/admin.service', () => ({
  getWeddingForAdmin: (id: string) => getWedding(id),
  getPaidPaymentForWedding: (wedding: unknown) => getPayment(wedding),
}));

const { GET } = await import('./route');

const WEDDING = {
  id: 'Wedding1234567890abc',
  slug: 'radha-shyam',
  bride: 'Radha',
  groom: 'Shyam',
  ownerPhoneE164: '+919876543210',
  leadId: 'lead1',
};

const PAYMENT = {
  id: 'Ab12Cd34Ef56Gh78Ij90',
  provider: 'razorpay',
  environment: 'production',
  status: 'paid',
  amountRupees: 499,
  amountPaid: 499,
  orderId: 'pay_123',
  paidAt: new Date('2026-10-21T06:00:00Z'),
};

function call(): Promise<Response> {
  return GET(new Request('http://localhost/admin/invites/x/invoice'), {
    params: Promise.resolve({ id: WEDDING.id }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  env.adminEnabled = true;
  getSession.mockResolvedValue({ uid: 'admin' });
  getWedding.mockResolvedValue(WEDDING);
  getPayment.mockResolvedValue(PAYMENT);
});

describe('GET /admin/invites/<id>/invoice', () => {
  it('downloads the invoice as a PDF named for the invite', async () => {
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="vivah-invoice-radha-shyam-VIV-20261021-AB12CD.pdf"',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const body = new TextDecoder().decode(await response.arrayBuffer());
    expect(body.startsWith('%PDF-')).toBe(true);
    expect(body).toContain('(Example Services)');
    expect(body).toContain('(Razorpay)');
  });

  it('answers 404 when /admin is off', async () => {
    env.adminEnabled = false;
    expect((await call()).status).toBe(404);
    expect(getSession).not.toHaveBeenCalled();
  });

  it('answers 401 without an admin session, and reads nothing', async () => {
    getSession.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    expect(getWedding).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown invite', async () => {
    getWedding.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });

  it('answers 404 when nothing was paid for the invite', async () => {
    getPayment.mockResolvedValue(null);
    expect((await call()).status).toBe(404);
  });

  it('answers 500 when the read fails', async () => {
    getPayment.mockRejectedValue(new Error('Firestore down'));
    expect((await call()).status).toBe(500);
  });
});
