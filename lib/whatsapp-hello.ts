/**
 * The first message our "chat with us" WhatsApp links type for a visitor.
 * The admin changes it from `/admin` (Home page tab), without a deploy. It
 * lives in `siteContent/whatsapp-hello` (`services/whatsapp-hello.service.ts`).
 * `DEFAULT_WHATSAPP_HELLO` shows before the first save, and when that read
 * fails. Pure, so it is tested without Firestore.
 *
 * Every page links to `WHATSAPP_CHAT_PATH`, which reads the message and
 * redirects to `wa.me`. So the pages stay static, and a change shows on
 * every link at once.
 */

import { z } from 'zod';

/** The fixed id of the one `siteContent` document. */
export const WHATSAPP_HELLO_DOC_ID = 'whatsapp-hello';

/** The route that opens a WhatsApp chat with us, with the message typed in. */
export const WHATSAPP_CHAT_PATH = '/api/whatsapp';

/** WhatsApp takes far more; a first message longer than this stops being one. */
export const WHATSAPP_HELLO_MAX_LENGTH = 300;

/** The message before the admin saves one. */
export const DEFAULT_WHATSAPP_HELLO =
  'Namaste Vivah team! 🙏 We are planning our wedding and would like a wedding invite website. Could you tell us more?';

export const whatsAppHelloSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Type a message.')
    .max(WHATSAPP_HELLO_MAX_LENGTH, `Keep it under ${WHATSAPP_HELLO_MAX_LENGTH} characters.`),
});

export type WhatsAppHello = z.infer<typeof whatsAppHelloSchema>;
