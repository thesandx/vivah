import 'server-only';

import { z } from 'zod';

import { env } from '@/lib/env';

/**
 * Cashfree Payment Links: create one link per payment, and read a link's
 * status. ADR-0011.
 *
 * The status read is what decides that a couple paid. The webhook and the
 * return from Cashfree's page only tell us WHICH link to read; neither body
 * is trusted on its own.
 *
 * Nothing here logs a key or a phone number. Errors carry Cashfree's own
 * message, cut short, which names the problem and never echoes the key.
 */

/** The API version this code was written against. Cashfree dates its versions. */
const API_VERSION = '2025-01-01';

/** One budget per call. The couple waits on `createPaymentLink`. */
const TIMEOUT_MS = 8_000;

function apiBase(): string {
  return env.cashfree.environment === 'production'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-version': API_VERSION,
    'x-client-id': env.cashfree.appId,
    'x-client-secret': env.cashfree.secretKey,
  };
}

export class CashfreeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'CashfreeError';
  }
}

async function failure(response: Response, what: string): Promise<CashfreeError> {
  const detail = (await response.text()).slice(0, 300);
  return new CashfreeError(
    `Cashfree ${what} failed (${response.status}): ${detail}`,
    response.status,
  );
}

/** Cashfree sends amounts as numbers in one place and strings in another. */
const amount = z.union([z.number(), z.string()]).transform(Number).pipe(z.number().finite());

const linkSchema = z.object({
  link_id: z.string(),
  link_url: z.string().url(),
  link_status: z.string(),
  link_currency: z.string().optional(),
  link_amount: amount,
  link_amount_paid: amount.optional(),
  cf_link_id: z.union([z.number(), z.string()]).transform(String).optional(),
});

export type CashfreeLink = z.infer<typeof linkSchema>;

export interface NewPaymentLink {
  linkId: string;
  amountRupees: number;
  purpose: string;
  customerName: string;
  /** From `cashfreeCustomerPhone`. */
  customerPhone: string;
  /** Where Cashfree's page sends the couple after paying. Absolute, ≤250 characters. */
  returnUrl: string;
  /** Where Cashfree posts the webhook. Absolute HTTPS. */
  notifyUrl: string;
  expiresAt: Date;
  notes: Record<string, string>;
}

/** Creates a payment link. Throws `CashfreeError` when Cashfree refuses. */
export async function createPaymentLink(link: NewPaymentLink): Promise<CashfreeLink> {
  const response = await fetch(`${apiBase()}/links`, {
    method: 'POST',
    headers: { ...headers(), 'x-idempotency-key': crypto.randomUUID() },
    body: JSON.stringify({
      link_id: link.linkId,
      link_amount: link.amountRupees,
      link_currency: 'INR',
      link_purpose: link.purpose,
      customer_details: { customer_phone: link.customerPhone, customer_name: link.customerName },
      link_partial_payments: false,
      link_expiry_time: link.expiresAt.toISOString(),
      // We send nothing by SMS or email: the couple is on the page already.
      link_notify: { send_sms: false, send_email: false },
      link_auto_reminders: false,
      link_notes: link.notes,
      link_meta: { return_url: link.returnUrl, notify_url: link.notifyUrl },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw await failure(response, 'creating a payment link');
  return linkSchema.parse(await response.json());
}

/** Reads a payment link's current status. Throws `CashfreeError` on a refusal. */
export async function getPaymentLink(linkId: string): Promise<CashfreeLink> {
  const response = await fetch(`${apiBase()}/links/${encodeURIComponent(linkId)}`, {
    headers: headers(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw await failure(response, 'reading a payment link');
  return linkSchema.parse(await response.json());
}
