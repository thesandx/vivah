import 'server-only';

import { z } from 'zod';

import { env } from '@/lib/env';
import { toPaise } from '@/lib/razorpay';

/**
 * Razorpay Orders: create one order per payment, and read an order's status.
 * The couple pays it in Razorpay's checkout, which opens over the preview
 * page. ADR-0012.
 *
 * As with Cashfree, the status read is what decides that a couple paid. The
 * checkout's answer and the webhook only tell us WHICH order to read.
 *
 * Nothing here logs a key or a phone number. Errors carry Razorpay's own
 * message, cut short, which names the problem and never echoes the key.
 */

const API_BASE = 'https://api.razorpay.com/v1';

/** One budget per call. The couple waits on `createOrder`. */
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

/** Amounts are in paise. `status` is `created`, `attempted` or `paid`. */
const orderSchema = z.object({
  id: z.string(),
  status: z.string(),
  currency: z.string(),
  amount: z.number(),
  amount_paid: z.number().optional(),
  receipt: z.string().nullable().optional(),
});

export type RazorpayOrder = z.infer<typeof orderSchema>;

export interface NewRazorpayOrder {
  /** From `razorpayReceipt`. */
  receipt: string;
  amountRupees: number;
  notes: Record<string, string>;
}

/** Creates an order. Throws `RazorpayError` when Razorpay refuses. */
export async function createOrder(order: NewRazorpayOrder): Promise<RazorpayOrder> {
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      amount: toPaise(order.amountRupees),
      currency: 'INR',
      receipt: order.receipt,
      notes: order.notes,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw await failure(response, 'creating an order');
  return orderSchema.parse(await response.json());
}

/** Reads an order's current status by Razorpay's `order_` id. */
export async function getOrder(orderId: string): Promise<RazorpayOrder> {
  const response = await fetch(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
    headers: headers(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw await failure(response, 'reading an order');
  return orderSchema.parse(await response.json());
}
