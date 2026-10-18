import 'server-only';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { siteOrigin } from '@/lib/seo';
import { formatWeddingDate } from '@/lib/wedding-date';

/**
 * Tells the team on Telegram that a couple made a preview, so somebody sends
 * them the link on WhatsApp by hand. Three messages, in this order, so each
 * one can be copied alone:
 *
 *   1. The alert: names, wedding date and the `/admin/previews/<id>` link.
 *   2. The message for the couple, with their preview link, ready to paste
 *      into WhatsApp.
 *   3. The couple's WhatsApp number and nothing else.
 *
 * The number goes to the team's own Telegram chat because the team asked for
 * it there (Sandeep, 2026-10-17). The privacy page says so. It is still never
 * logged.
 *
 * Sending is best effort. A failure never fails the sign-up, and nothing is
 * sent until `env.telegram.enabled` (bot token and chat id both set).
 */

/**
 * One budget for all three messages, inside the sign-up request. The form
 * gives the whole request 10 seconds, so this must stay well below it.
 */
const TIMEOUT_MS = 4_000;

export interface NewLeadNotice {
  leadId: string;
  bride: string;
  groom: string;
  /** `YYYY-MM-DD`. */
  weddingDate: string;
  /** The address the couple chose, or `null`. */
  slug: string | null;
  /** E.164, e.g. `+919876543210`. Never logged. */
  phoneE164: string;
}

/**
 * The three messages. Plain text, so a name with `*` or `_` needs no
 * escaping. Pure apart from the origin, so it is tested alone.
 */
export function newLeadMessages(notice: NewLeadNotice): [string, string, string] {
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  const host = new URL(origin).host;
  const ownLink =
    notice.slug === null ? `your own ${host} link` : `your own link, ${notice.slug}.${host}`;

  const alert = [
    `New preview: ${notice.bride} & ${notice.groom}`,
    `Wedding: ${formatWeddingDate(notice.weddingDate)}`,
    `Admin: ${origin}/admin/previews/${notice.leadId}`,
  ].join('\n');

  const forCouple = [
    `Namaste ${notice.bride} & ${notice.groom} 🙏`,
    'Congratulations on your wedding! 🎉',
    '',
    'We made your wedding invite, and it looks beautiful ✨ Tap to see it:',
    `${origin}/p/${notice.leadId}`,
    '',
    '• Your preview stays open for 30 minutes. If it closes, message us here and we will open it again.',
    `• Love it? Make it live from the same page and get ${ownLink}, ready to share with every guest.`,
    '',
    'Open the link to see your invite, and make it live after purchase. Your guests are waiting to hear the good news! 💌',
    '',
    'Team Vivah 💛',
  ].join('\n');

  return [alert, forCouple, notice.phoneE164];
}

/**
 * Sends the three messages, one after another so they arrive in order.
 * Resolves `true` when Telegram accepted all three. Never throws.
 */
export async function notifyNewLead(notice: NewLeadNotice): Promise<boolean> {
  if (!env.telegram.enabled) return false;

  // The token is part of the URL, so the URL is never logged.
  const url = `https://api.telegram.org/bot${env.telegram.botToken}/sendMessage`;
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    for (const text of newLeadMessages(notice)) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.telegram.chatId,
          text,
          link_preview_options: { is_disabled: true },
        }),
        signal,
      });
      if (!response.ok) {
        // Telegram's error names the cause (bad token, chat not found) and
        // never echoes the token. It is cut short in case that ever changes.
        const detail = (await response.text()).slice(0, 300);
        logger.error('Telegram refused the new preview notice', undefined, {
          leadId: notice.leadId,
          status: response.status,
          detail,
        });
        return false;
      }
    }
    return true;
  } catch (error) {
    logger.error('Sending the Telegram notice failed', error, { leadId: notice.leadId });
    return false;
  }
}

export interface PaymentNotice {
  paymentId: string;
  leadId: string;
  slug: string;
  amountRupees: number;
  /** What the payment did: see `PAYMENT_OUTCOMES` in `services/payment.service.ts`. */
  kind: 'published' | 'address-taken' | 'duplicate';
}

/** The one message about a payment. Pure apart from the origin. */
export function paymentMessage(notice: PaymentNotice): string {
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  const host = new URL(origin).host;
  const amount = `₹${notice.amountRupees.toLocaleString('en-IN')}`;
  const headline = {
    published: `Paid ${amount}: ${notice.slug}.${host} is live`,
    'address-taken': `Paid ${amount}, but ${notice.slug}.${host} was taken. The couple picks another address on their preview.`,
    duplicate: `Paid ${amount} a SECOND time for one invite. Refund it in Cashfree.`,
  }[notice.kind];
  return [
    headline,
    `Admin: ${origin}/admin/previews/${notice.leadId}`,
    `Payment: ${notice.paymentId}`,
  ].join('\n');
}

/** Tells the team about a payment. Best effort: never throws. */
export async function notifyPayment(notice: PaymentNotice): Promise<boolean> {
  if (!env.telegram.enabled) return false;
  const url = `https://api.telegram.org/bot${env.telegram.botToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.telegram.chatId,
        text: paymentMessage(notice),
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.error('Telegram refused the payment notice', undefined, {
        paymentId: notice.paymentId,
        status: response.status,
      });
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Sending the payment notice failed', error, { paymentId: notice.paymentId });
    return false;
  }
}
