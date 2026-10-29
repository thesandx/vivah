import 'server-only';

import { coupleNames, type NameOrder } from '@/lib/couple-names';
import { env } from '@/lib/env';
import { HOT_AFTER_MINUTES, hotFollowUpAt } from '@/lib/hot-follow-up';
import { logger } from '@/lib/logger';
import { siteOrigin } from '@/lib/seo';
import { formatWeddingDate } from '@/lib/wedding-date';
import { welcomeMessage } from '@/lib/welcome-message';

/**
 * Tells the team on Telegram that a couple made a preview, so somebody sends
 * them the link on WhatsApp by hand. Three messages, in this order, so each
 * one can be copied alone:
 *
 *   1. The alert: names, wedding date, the time to follow up if the couple
 *      has not paid (`lib/hot-follow-up.ts`) and the `/admin/previews/<id>`
 *      link, where the follow-up message waits ready to send.
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
 * The deadline for all three messages, retries included, inside the sign-up
 * request. The form gives the whole request 10 seconds, and the address check
 * and the lead write come first, so this must stay well below it.
 */
const NEW_LEAD_BUDGET_MS = 7_000;

export interface NewLeadNotice {
  leadId: string;
  bride: string;
  groom: string;
  /** Whose name comes first. Absent: the bride's. */
  nameOrder?: NameOrder;
  /** `YYYY-MM-DD`. */
  weddingDate: string;
  /** The address the couple chose, or `null`. */
  slug: string | null;
  /** E.164, e.g. `+919876543210`. Never logged. */
  phoneE164: string;
  /** When the couple asked, for the follow-up time. */
  createdAt: Date;
}

/** A time of day as the admin reads it in India: `2:41 pm`. */
function timeInIndia(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
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
    `New preview: ${coupleNames(notice)}`,
    `Wedding: ${formatWeddingDate(notice.weddingDate)}`,
    `Not paid by ${timeInIndia(hotFollowUpAt(notice.createdAt))} (${HOT_AFTER_MINUTES} min)? Send the hot follow-up from admin:`,
    `Admin: ${origin}/admin/previews/${notice.leadId}`,
  ].join('\n');

  const forCouple = [
    `Namaste ${coupleNames(notice)} 🙏`,
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
 * Sends the three messages, one after another so they arrive in order. Each
 * message has its own timeout and one retry, and a failed message does not
 * stop the ones after it, all inside `NEW_LEAD_BUDGET_MS`. Resolves `true`
 * when Telegram accepted all three. Never throws.
 *
 * The three once shared one 4-second timeout and stopped at the first
 * failure. A slow alert then used up the budget, so the alert arrived and the
 * couple's message and number never did (27 Oct 2026).
 */
export function notifyNewLead(notice: NewLeadNotice): Promise<boolean> {
  return sendAll(newLeadMessages(notice), { leadId: notice.leadId }, NEW_LEAD_BUDGET_MS);
}

export interface PaymentNotice {
  paymentId: string;
  leadId: string;
  slug: string;
  amountRupees: number;
  /** What the payment did: see `PAYMENT_OUTCOMES` in `services/payment.service.ts`. */
  kind: 'published' | 'address-taken' | 'duplicate';
  /** The couple, for the welcome message once the site is live. */
  bride: string;
  groom: string;
  /** Whose name comes first. Absent: the bride's. */
  nameOrder?: NameOrder;
  /** E.164. Never logged. */
  phoneE164: string;
  /** The coupon the couple paid with, for a referral cashback. ADR-0015. */
  couponCode?: string;
}

/**
 * The messages about a payment. Once the site is live there are three, like
 * the new-preview notice, so each can be copied alone (Sandeep, 2026-10-18):
 *
 *   1. The alert: amount, address and the `/admin/previews/<id>` link.
 *   2. The welcome message for the couple, ready to paste into WhatsApp.
 *   3. The couple's WhatsApp number and nothing else.
 *
 * A payment that published nothing (address taken, paid twice) sends the
 * alert alone. Pure apart from the origin.
 */
export function paymentMessages(notice: PaymentNotice): string[] {
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  const host = new URL(origin).host;
  const amount = `₹${notice.amountRupees.toLocaleString('en-IN')}`;
  const names = coupleNames(notice);
  const headline = {
    published: `Paid ${amount}: ${names} are live at ${notice.slug}.${host}`,
    'address-taken': `Paid ${amount}, but ${notice.slug}.${host} was taken. ${names} pick another address on their preview.`,
    duplicate: `Paid ${amount} a SECOND time by ${names}. Refund it in the payment dashboard.`,
  }[notice.kind];
  const alert = [
    headline,
    ...(notice.couponCode === undefined ? [] : [`Coupon: ${notice.couponCode}`]),
    `Admin: ${origin}/admin/previews/${notice.leadId}`,
    `Payment: ${notice.paymentId}`,
  ].join('\n');
  if (notice.kind !== 'published') return [alert];

  const forCouple = welcomeMessage({
    bride: notice.bride,
    groom: notice.groom,
    nameOrder: notice.nameOrder,
    slug: notice.slug,
    phoneE164: notice.phoneE164,
    origin,
  });
  return [alert, forCouple, notice.phoneE164];
}

/** Each message gets its own timeout, so a slow first send cannot starve the rest. */
const MESSAGE_TIMEOUT_MS = 4_000;

/** The longest wait before the one retry, even when Telegram asks for longer. */
const MAX_RETRY_WAIT_MS = 3_000;

/** A retry that cannot get this long before the deadline is not tried. */
const MIN_ATTEMPT_MS = 1_000;

type SendResult =
  | { ok: true }
  | { ok: false; retry: boolean; waitMs: number; status: number | null; detail: string };

async function sendOne(url: string, text: string, timeoutMs: number): Promise<SendResult> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.telegram.chatId,
        text,
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.ok) return { ok: true };
    // 429 carries `parameters.retry_after` in seconds. A 4xx other than 429
    // will fail the same way again, so only 429 and 5xx are retried.
    const body: unknown = await response.json().catch(() => null);
    const retryAfter =
      typeof body === 'object' && body !== null && 'parameters' in body
        ? Number((body as { parameters?: { retry_after?: unknown } }).parameters?.retry_after)
        : NaN;
    // Telegram's `description` names the cause (bad token, chat not found)
    // and never echoes the token. It is cut short in case that ever changes.
    const description =
      typeof body === 'object' && body !== null && 'description' in body
        ? String((body as { description?: unknown }).description)
        : '';
    return {
      ok: false,
      retry: response.status === 429 || response.status >= 500,
      waitMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : 500,
      status: response.status,
      detail: description.slice(0, 300),
    };
  } catch (error) {
    // A timeout or a dropped connection. Worth one more try. The error's name
    // (`TimeoutError`, `TypeError`) says which; its message may hold the URL.
    const name = error instanceof Error ? error.name : 'unknown';
    return { ok: false, retry: true, waitMs: 500, status: null, detail: name };
  }
}

/**
 * Sends messages one after another, so they arrive in order. Each message
 * has its own timeout and one retry, and a failed message does not stop the
 * ones after it: the welcome text for the couple matters most, so it must
 * not be lost because the alert before it was slow. With a `budgetMs`, no
 * attempt runs past that deadline. Resolves `true` when Telegram accepted
 * every message. Never throws.
 */
async function sendAll(
  texts: readonly string[],
  context: Record<string, string>,
  budgetMs = Number.POSITIVE_INFINITY,
): Promise<boolean> {
  if (!env.telegram.enabled) return false;
  const deadline = Date.now() + budgetMs;
  const timeLeft = (): number => Math.min(MESSAGE_TIMEOUT_MS, deadline - Date.now());
  // The token is part of the URL, so the URL is never logged.
  const url = `https://api.telegram.org/bot${env.telegram.botToken}/sendMessage`;
  let sent = 0;
  for (const [index, text] of texts.entries()) {
    const message = `${index + 1} of ${texts.length}`;
    if (timeLeft() < MIN_ATTEMPT_MS) {
      logger.error('Telegram message skipped: no time left', undefined, { ...context, message });
      continue;
    }
    let result = await sendOne(url, text, timeLeft());
    if (!result.ok && result.retry) {
      const waitMs = Math.min(result.waitMs, MAX_RETRY_WAIT_MS);
      if (timeLeft() - waitMs >= MIN_ATTEMPT_MS) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        result = await sendOne(url, text, timeLeft());
      }
    }
    if (result.ok) {
      sent += 1;
    } else {
      logger.error('Telegram did not take a message', undefined, {
        ...context,
        message,
        status: result.status ?? 'no answer',
        detail: result.detail,
      });
    }
  }
  logger.info('Telegram messages sent', { ...context, sent, of: texts.length });
  return sent === texts.length;
}

/** Tells the team about a payment, one message after another. Best effort: never throws. */
export function notifyPayment(notice: PaymentNotice): Promise<boolean> {
  return sendAll(paymentMessages(notice), { paymentId: notice.paymentId });
}

export interface PaymentFailureNotice {
  paymentId: string;
  leadId: string;
  /** Which provider and account refused, e.g. `Razorpay production`. */
  environment: string;
  /** Why, as the provider said it. Cut short; it never carries the key. */
  detail: string;
}

/**
 * The alert when a payment does not start. The team reads the provider's own
 * reason here, with no access to the logs (Sandeep, 2026-10-18).
 */
export function paymentFailureMessage(notice: PaymentFailureNotice): string {
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  return [
    `⚠️ A couple pressed Pay, but the payment did not start (${notice.environment}).`,
    `Reason: ${notice.detail.slice(0, 400)}`,
    `Admin: ${origin}/admin/previews/${notice.leadId}`,
    `Payment: ${notice.paymentId}`,
  ].join('\n');
}

/** Tells the team that a payment did not start. Best effort: never throws. */
export function notifyPaymentFailure(notice: PaymentFailureNotice): Promise<boolean> {
  return sendAll([paymentFailureMessage(notice)], { paymentId: notice.paymentId });
}
