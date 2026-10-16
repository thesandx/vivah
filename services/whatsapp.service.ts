import 'server-only';

import { z } from 'zod';

import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * Sends a couple their preview link on WhatsApp, through Meta's Cloud API.
 *
 * A business may start a WhatsApp chat only with an approved template. The
 * template this sends is a UTILITY template (the couple asked for the preview
 * and ticked the WhatsApp consent box), with this shape:
 *
 *   Body:   "Hi {{1}}, your wedding invite preview is ready. ..."
 *           {{1}} is the couple's names, e.g. "Riya & Aman".
 *   Button: a URL button, https://vivah.online/p/{{1}}
 *           {{1}} is the lead id, so only the id travels in the request.
 *
 * `marketing/business-accounts-setup.md` in the project files has the exact
 * template text to submit. A template with another shape fails here with a
 * 400 from Meta, which is logged and changes nothing for the couple.
 *
 * Sending is best effort. A failure never fails the sign-up: the preview
 * still opens on screen, so the worst case is the flow we had before.
 * `env.whatsapp.enabled` is false until the token, the phone number id and
 * the template name are all configured, and then nothing is sent at all.
 */

/**
 * Meta answers in well under a second. Four seconds bounds the wait inside
 * the sign-up request, which the couple watches as the "making" steps. The
 * form gives the whole request 10 seconds, so this must stay well below it.
 */
const TIMEOUT_MS = 4_000;

const sendResponseSchema = z.object({
  messages: z.array(z.object({ id: z.string() })).min(1),
});

export interface PreviewMessage {
  /** E.164, e.g. `+919876543210`. Never logged. */
  phoneE164: string;
  /** Shown in the greeting, e.g. `Riya & Aman`. */
  coupleNames: string;
  /** The lead id. It completes the button's link: `/p/<leadId>`. */
  leadId: string;
}

/** The Cloud API request body for the preview template. Pure, so it is tested alone. */
export function previewTemplateBody(message: PreviewMessage): Record<string, unknown> {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    // The Cloud API takes the number with its country code and no `+`.
    to: message.phoneE164.replace(/^\+/, ''),
    type: 'template',
    template: {
      name: env.whatsapp.templateName,
      language: { code: env.whatsapp.templateLanguage },
      components: [
        { type: 'body', parameters: [{ type: 'text', text: message.coupleNames }] },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: message.leadId }],
        },
      ],
    },
  };
}

/**
 * Sends the preview template. Resolves `true` when Meta accepted the message,
 * `false` when sending is off or failed. Never throws.
 *
 * "Accepted" is not "delivered": a number with no WhatsApp account is
 * accepted here and fails later, in a status webhook this app does not read.
 */
export async function sendPreviewLink(message: PreviewMessage): Promise<boolean> {
  if (!env.whatsapp.enabled) return false;

  const url = `https://graph.facebook.com/${env.whatsapp.graphVersion}/${env.whatsapp.phoneNumberId}/messages`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.whatsapp.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(previewTemplateBody(message)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      // Meta's error names the cause (bad token, unknown template, wrong
      // parameter count) and never echoes the phone number, so it is safe
      // to log. It is cut short in case that ever changes.
      const detail = (await response.text()).slice(0, 500);
      logger.error('WhatsApp preview message refused', undefined, {
        leadId: message.leadId,
        status: response.status,
        detail,
      });
      return false;
    }

    const parsed = sendResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      logger.error('WhatsApp answered in an unexpected shape', undefined, {
        leadId: message.leadId,
      });
      return false;
    }

    logger.info('WhatsApp preview message accepted', {
      leadId: message.leadId,
      messageId: parsed.data.messages[0]?.id,
    });
    return true;
  } catch (error) {
    logger.error('Sending the WhatsApp preview message failed', error, { leadId: message.leadId });
    return false;
  }
}
