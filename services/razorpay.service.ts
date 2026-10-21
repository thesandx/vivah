import 'server-only';

import { z } from 'zod';

import { env } from '@/lib/env';
import { toPaise } from '@/lib/razorpay';

/**
 * Razorpay Payment Links: create one link per payment, and read a link's
 * status. ADR-0012.
 *
 * As with Cashfree, the status read is what decides that a couple paid. The
 * webhook and the return from Razorpay's page only tell us WHICH link to
 * read; neither is trusted on its own.
 *
 * Nothing here logs a key or a phone number. Errors carry Razorpay's own
 * message, cut short, which names the problem and never echoes the key.
 */

const API_BASE = 'https://api.razorpay.com/v1';

/** One budget per call. The couple waits on `createPaymentLink`. */
const TIMEOUT_MS = 8_000;

function headers(): Record<string, string> {
  const basic = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
  return { 'Content-Type': 'application/json', Authorization: `Basic ${basic}` };
}

export class RazorpayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'RazorpayError';
  }
}

async function failure(response: Response, what: string): Promise<RazorpayError> {
  const detail = (await response.text()).slice(0, 300);
  return new RazorpayError(
    `Razorpay ${what} failed (${response.status}): ${detail}`,
    response.status,
  );
}

/** Amounts are in paise. */
const linkSchema = z.object({
  id: z.string(),
  short_url: z.string().url(),
  status: z.string(),
  currency: z.string().optional(),
  amount: z.number(),
  amount_paid: z.number().optional(),
  reference_id: z.string().optional(),
});

export type RazorpayLink = z.infer<typeof linkSchema>;

export interface NewRazorpayLink {
  /** From `razorpayReferenceId`. */
  referenceId: string;
  amountRupees: number;
  description: string;
  customerName: string;
  /** E.164, as Razorpay wants it: country code included. */
  customerPhone: string;
  /** Where Razorpay's page sends the couple after paying. Absolute. */
  callbackUrl: string;
  /** At least 15 minutes ahead; Razorpay refuses a sooner one. */
  expiresAt: Date;
  notes: Record<string, string>;
}

/** Creates a payment link. Throws `RazorpayError` when Razorpay refuses. */
export async function createPaymentLink(link: NewRazorpayLink): Promise<RazorpayLink> {
  const response = await fetch(`${API_BASE}/payment_links`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      amount: toPaise(link.amountRupees),
      currency: 'INR',
      accept_partial: false,
      reference_id: link.referenceId,
      description: link.description,
      customer: { name: link.customerName, contact: link.customerPhone },
      expire_by: Math.floor(link.expiresAt.getTime() / 1000),
      // We send nothing by SMS or email: the couple is on the page already.
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: link.notes,
      callback_url: link.callbackUrl,
      callback_method: 'get',
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw await failure(response, 'creating a payment link');
  return linkSchema.parse(await response.json());
}

/** Reads a payment link's current status by Razorpay's `plink_` id. */
export async function getPaymentLink(linkId: string): Promise<RazorpayLink> {
  const response = await fetch(`${API_BASE}/payment_links/${encodeURIComponent(linkId)}`, {
    headers: headers(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw await failure(response, 'reading a payment link');
  return linkSchema.parse(await response.json());
}
