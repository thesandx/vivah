import 'server-only';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { siteOrigin } from '@/lib/seo';
import { formatWeddingDate } from '@/lib/wedding-date';

/**
 * Tells the team on Telegram that a couple made a preview, so somebody sends
 * them the link on WhatsApp by hand from `/admin/previews/<id>`.
 *
 * The message carries the couple's names, the wedding date and the admin
 * link. It never carries the phone number: Telegram is a third party, and the
 * admin page shows the number behind the admin sign-in.
 *
 * Sending is best effort. A failure never fails the sign-up, and nothing is
 * sent until `env.telegram.enabled` (bot token and chat id both set).
 */

/** Telegram answers fast. This bounds the wait inside the sign-up request. */
const TIMEOUT_MS = 3_000;

export interface NewLeadNotice {
  leadId: string;
  /** e.g. `Riya & Aman`. */
  coupleNames: string;
  /** `YYYY-MM-DD`. */
  weddingDate: string;
}

/** The notice text. Plain text, so a name with `*` or `_` needs no escaping. */
export function newLeadText(notice: NewLeadNotice): string {
  const origin = siteOrigin(env.rootDomain, env.appUrl);
  return [
    `New preview: ${notice.coupleNames}`,
    `Wedding: ${formatWeddingDate(notice.weddingDate)}`,
    `Send it on WhatsApp: ${origin}/admin/previews/${notice.leadId}`,
  ].join('\n');
}

/** Sends the notice. Resolves `true` when Telegram accepted it. Never throws. */
export async function notifyNewLead(notice: NewLeadNotice): Promise<boolean> {
  if (!env.telegram.enabled) return false;

  // The token is part of the URL, so the URL is never logged.
  const url = `https://api.telegram.org/bot${env.telegram.botToken}/sendMessage`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.telegram.chatId,
        text: newLeadText(notice),
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
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
    return true;
  } catch (error) {
    logger.error('Sending the Telegram notice failed', error, { leadId: notice.leadId });
    return false;
  }
}
