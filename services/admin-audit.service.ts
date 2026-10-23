import 'server-only';

import type { Transaction } from '@google-cloud/firestore';
import { z } from 'zod';

import { logger } from '@/lib/logger';
import { createRepository, type StoredDocument } from '@/services/repository';

/**
 * The admin audit log: one document per change made from `/admin`, so every
 * edit, pause, delete and restore can be traced to a time and a session.
 *
 * Append-only. Nothing updates or deletes an entry. The `detail` is a plain
 * sentence for a person to read, and it NEVER holds a phone number or an
 * email address: the log is read on screen and copied into tickets.
 */

export const ADMIN_AUDIT_COLLECTION = 'adminAudit';

export const ADMIN_ACTIONS = [
  'signed-in',
  'signed-out',
  'wedding-edited',
  'wedding-functions-edited',
  'wedding-phone-changed',
  'wedding-address-changed',
  'wedding-paused',
  'wedding-resumed',
  'wedding-deleted',
  'wedding-restored',
  'wedding-address-released',
  'preview-reactivated',
  'preview-made-live',
  'preview-deleted',
  'preview-restored',
  'preview-song-changed',
  'preview-functions-changed',
  'home-image-changed',
  'home-image-reset',
  'testimonial-added',
  'testimonial-edited',
  'testimonial-removed',
  'testimonial-moved',
  'banner-changed',
  'song-changed',
  'song-removed',
  'demo-video-changed',
  'demo-video-removed',
  'help-video-changed',
  'help-video-removed',
] as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export const adminAuditSchema = z.object({
  action: z.enum(ADMIN_ACTIONS),
  targetType: z.enum(['wedding', 'lead', 'admin', 'site']),
  /** The document id the action touched. */
  targetId: z.string().min(1).max(128),
  /** What happened, in words. No phone numbers, no email addresses. */
  detail: z.string().max(300),
  /** The Firebase uid of the admin's Google account. */
  adminUid: z.string().min(1).max(128),
});

export type AdminAuditPayload = z.infer<typeof adminAuditSchema>;
export type AdminAuditEntry = StoredDocument<AdminAuditPayload>;

export const adminAudit = createRepository({
  collection: ADMIN_AUDIT_COLLECTION,
  schema: adminAuditSchema,
});

/**
 * Records an admin action. A failure is logged, not thrown: the change itself
 * already happened, and telling the admin it failed would be untrue.
 */
export async function recordAdminAction(entry: AdminAuditPayload): Promise<void> {
  try {
    await adminAudit.create(entry);
  } catch (error) {
    logger.error('Writing the admin audit log failed', error, {
      action: entry.action,
      targetId: entry.targetId,
    });
  }
  logger.info('Admin action', {
    action: entry.action,
    targetId: entry.targetId,
    uid: entry.adminUid,
  });
}

/** Records the action inside `tx`, so it commits with the change or not at all. */
export function recordAdminActionIn(tx: Transaction, entry: AdminAuditPayload): void {
  adminAudit.inTransaction(tx).create(entry);
}

/** How many entries the activity tab shows. */
export const AUDIT_PAGE_SIZE = 100;

/**
 * The newest entries. `includeDeleted` because nothing is ever deleted here,
 * and it lets the query use the automatic single-field index on `createdAt`
 * instead of a composite one.
 */
export async function recentAdminActions(): Promise<readonly AdminAuditEntry[]> {
  const page = await adminAudit.list({ limit: AUDIT_PAGE_SIZE, includeDeleted: true });
  return page.items;
}
