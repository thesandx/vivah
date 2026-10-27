import 'server-only';

import { SITE_CONTENT_COLLECTION } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import { withTimeout } from '@/lib/utils';
import {
  DEFAULT_WHATSAPP_HELLO,
  WHATSAPP_HELLO_DOC_ID,
  whatsAppHelloSchema,
} from '@/lib/whatsapp-hello';
import type { AdminResult } from '@/services/admin.service';
import { recordAdminActionIn } from '@/services/admin-audit.service';
import { createRepository } from '@/services/repository';

/**
 * The first message of our "chat with us" WhatsApp links (`lib/whatsapp-hello.ts`),
 * which the admin changes from `/admin` without a deploy.
 *
 * One document, `siteContent/whatsapp-hello`. The id is fixed because the
 * chat route reads it by key; an admin writes it a few times a year, so it
 * is never a hotspot.
 */

const whatsAppHello = createRepository({
  collection: SITE_CONTENT_COLLECTION,
  schema: whatsAppHelloSchema,
});

/** The id is fixed and short on purpose; see the module comment. */
const ID_OPTIONS = { minLength: WHATSAPP_HELLO_DOC_ID.length };

/** One instance reads the document at most once a minute. */
const CACHE_MS = 60 * 1000;

/** The chat route waits this long for the message, then uses the default. */
const READ_TIMEOUT_MS = 1500;

let cached: { at: number; message: string } | null = null;

/** Forgets the cached message on this instance. For tests, and after a change. */
export function resetWhatsAppHelloCache(): void {
  cached = null;
}

async function readMessage(): Promise<string> {
  const document = await withTimeout(
    whatsAppHello.get(WHATSAPP_HELLO_DOC_ID),
    READ_TIMEOUT_MS,
    'Reading the WhatsApp first message',
  );
  return document === null ? DEFAULT_WHATSAPP_HELLO : whatsAppHelloSchema.parse(document).message;
}

/**
 * The message the chat links type. Cached for a minute. A failed read uses
 * the default and is logged; the link never fails for it.
 */
export async function getWhatsAppHello(): Promise<string> {
  if (cached !== null && Date.now() - cached.at < CACHE_MS) return cached.message;
  try {
    const message = await readMessage();
    cached = { at: Date.now(), message };
    return message;
  } catch (error) {
    logger.warn('The WhatsApp first message could not be read', {
      reason: error instanceof Error ? error.message : String(error),
    });
    return DEFAULT_WHATSAPP_HELLO;
  }
}

/** The saved message, uncached, for `/admin`. A failed read throws. */
export async function getWhatsAppHelloForAdmin(): Promise<string> {
  return readMessage();
}

/** Writes `message`, with its audit entry, in one transaction. */
async function writeMessage(
  message: string,
  adminUid: string,
  audit: { action: 'whatsapp-hello-changed' | 'whatsapp-hello-reset'; detail: string },
): Promise<void> {
  await whatsAppHello.runTransaction(async (repo, tx) => {
    if ((await repo.get(WHATSAPP_HELLO_DOC_ID)) === null) {
      repo.createWithId(WHATSAPP_HELLO_DOC_ID, { message }, ID_OPTIONS);
    } else {
      repo.update(WHATSAPP_HELLO_DOC_ID, { message });
    }
    recordAdminActionIn(tx, {
      action: audit.action,
      targetType: 'site',
      targetId: WHATSAPP_HELLO_DOC_ID,
      detail: audit.detail,
      adminUid,
    });
  });
  resetWhatsAppHelloCache();
}

/** Saves the admin's message. Only `/admin` calls this, after `requireAdmin()`. */
export async function saveWhatsAppHello(raw: unknown, adminUid: string): Promise<AdminResult> {
  const parsed = whatsAppHelloSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Check the message.' };
  }
  await writeMessage(parsed.data.message, adminUid, {
    action: 'whatsapp-hello-changed',
    detail: 'Changed the WhatsApp first message.',
  });
  return { ok: true, message: 'Saved. The WhatsApp links type the new message within a minute.' };
}

/** Puts the default message back. */
export async function resetWhatsAppHello(adminUid: string): Promise<AdminResult> {
  await writeMessage(DEFAULT_WHATSAPP_HELLO, adminUid, {
    action: 'whatsapp-hello-reset',
    detail: 'Put back the default WhatsApp first message.',
  });
  return { ok: true, message: 'The WhatsApp links type the default message again.' };
}
