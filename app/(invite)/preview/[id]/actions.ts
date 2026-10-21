'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';

import { PRICE_FROM_RUPEES } from '@/lib/business';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { PREVIEW_COOKIE_NAME } from '@/lib/preview-cookie';
import { inviteHref } from '@/lib/site-host';
import { paymentMode, startPayment } from '@/services/payment.service';
import { checkSlug, publishWedding, type SlugAvailability } from '@/services/wedding.service';
import type { RazorpayCheckout } from '@/types/razorpay-checkout';

/**
 * Server Actions for the preview page: check an address, then publish.
 *
 * Server Actions, not route handlers, because of the preview cookie. Its path
 * is `/preview/<id>`, so the browser sends it only to that path, and an action
 * posts to the page it runs on. A route under `/api/` would never see it.
 *
 * Neither action has a session. With a payment provider configured, the
 * publish action only starts a payment, and the payment publishes (ADR-0011,
 * ADR-0012): any browser that can see the preview may pay. Without one, in
 * development, it publishes free from the bound browser (ADR-0007).
 */

/** The longest input either action reads. Longer than any valid slug. */
const MAX_INPUT_LENGTH = 100;

const slugInput = z.string().max(MAX_INPUT_LENGTH);
const leadIdInput = z.string().max(MAX_INPUT_LENGTH);

/** Is this address free? A read: it changes nothing. */
export async function checkSlugAction(slug: unknown): Promise<SlugAvailability> {
  const parsed = slugInput.safeParse(slug);
  if (!parsed.success) {
    return { available: false, reason: 'invalid', message: 'Enter an address.' };
  }
  try {
    return await checkSlug(parsed.data);
  } catch (error) {
    logger.error('Checking an address failed', error);
    throw new Error('We could not check this address. Try again.');
  }
}

export type PublishActionResult =
  | { ok: true; url: string; to?: 'payment' | 'invite' }
  | { ok: true; checkout: RazorpayCheckout }
  | { ok: false; message: string; taken?: boolean };

/** What the couple reads for each way publishing can fail. */
const FAILURE: Record<string, string> = {
  taken: 'Somebody took this address a moment ago. Choose another.',
  'not-found': 'This preview link does not work. Start again on the home page.',
  expired: 'This preview has expired. Start again on the home page.',
  'other-browser': 'Open this preview on the phone you opened it on first.',
  unavailable:
    'Payment is not open right now. Message us on WhatsApp and we will publish your invite.',
};

/**
 * The pay button. Live with Cashfree, it answers with the payment page to
 * open; Cashfree's webhook and return publish the invite (ADR-0011). Live
 * with Razorpay, it answers with an order for the page to open in
 * Razorpay's checkout (ADR-0012). In test mode it publishes at once
 * (ADR-0007).
 */
export async function publishAction(leadId: unknown, slug: unknown): Promise<PublishActionResult> {
  const parsedId = leadIdInput.safeParse(leadId);
  const parsedSlug = slugInput.safeParse(slug);
  if (!parsedId.success || !parsedSlug.success) {
    return { ok: false, message: 'Choose an address first.' };
  }
  return paymentMode() === 'test'
    ? testPublish(parsedId.data, parsedSlug.data)
    : pay(parsedId.data, parsedSlug.data);
}

async function pay(leadId: string, slug: string): Promise<PublishActionResult> {
  try {
    const result = await startPayment(leadId, slug, PRICE_FROM_RUPEES);
    switch (result.state) {
      case 'redirect':
        return { ok: true, url: result.url, to: 'payment' };
      case 'checkout':
        return { ok: true, checkout: result.checkout };
      case 'published':
        // Paid earlier, published now: the same success screen as after paying.
        logger.info('Wedding published', { leadId, slug: result.slug });
        return { ok: true, url: `/preview/${leadId}?payment=success`, to: 'invite' };
      case 'already-published':
        return { ok: true, url: inviteHref(result.slug, env.rootDomain), to: 'invite' };
      case 'invalid':
        return { ok: false, message: result.message };
      case 'taken':
        return { ok: false, message: FAILURE.taken ?? '', taken: true };
      default:
        return { ok: false, message: FAILURE[result.state] ?? 'Payment did not start. Try again.' };
    }
  } catch (error) {
    logger.error('Starting a payment failed', error, { leadId });
    return {
      ok: false,
      message: `Payment did not start. Try again in a minute, or message us on WhatsApp.`,
    };
  }
}

/** Development without payment keys: publish free, from the bound browser only. */
async function testPublish(leadId: string, slug: string): Promise<PublishActionResult> {
  try {
    const store = await cookies();
    const result = await publishWedding(leadId, store.get(PREVIEW_COOKIE_NAME)?.value, slug);

    if (result.state === 'published') {
      // The lead id, never the phone number. See CLAUDE.md > Authentication.
      logger.info('Wedding published', { leadId, slug: result.slug });
      return { ok: true, url: `/preview/${leadId}?payment=success`, to: 'invite' };
    }
    if (result.state === 'already-published') {
      return { ok: true, url: inviteHref(result.slug, env.rootDomain), to: 'invite' };
    }
    if (result.state === 'invalid') return { ok: false, message: result.message };
    return {
      ok: false,
      message: FAILURE[result.state] ?? 'Your invite was not published. Try again.',
      ...(result.state === 'taken' && { taken: true }),
    };
  } catch (error) {
    logger.error('Publishing a wedding failed', error, { leadId });
    return { ok: false, message: 'Your invite was not published. Try again.' };
  }
}
