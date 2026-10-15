'use server';

import { revalidatePath } from 'next/cache';

import type { ActionState } from '@/components/admin/AdminActionForm';
import type { SaveState } from '@/components/dashboard/WeddingDetailsForm';
import { logger } from '@/lib/logger';
import { toE164 } from '@/lib/phone';
import {
  type AdminResult,
  changeWeddingAddress,
  changeWeddingPhone,
  deleteLead,
  deleteWedding,
  editWeddingDetails,
  reactivatePreview,
  releaseWeddingAddress,
  restoreLead,
  restoreWedding,
  setWeddingStatus,
} from '@/services/admin.service';
import { requireAdmin } from '@/services/admin-session.service';

/**
 * The admin dashboard's Server Actions. Each is a public endpoint, whatever
 * page shows its button, so each starts with `requireAdmin()`: the two-step
 * admin session, checked again on every call (ADR-0008). Each service call
 * writes the audit log.
 */

const SIGN_IN_AGAIN_MESSAGE = 'Your admin session has ended. Reload the page and sign in again.';
const SIGN_IN_AGAIN: ActionState = { status: 'error', message: SIGN_IN_AGAIN_MESSAGE };

/** Runs one admin change, and turns the result into words for the button. */
async function run(
  name: string,
  id: string,
  change: (adminUid: string) => Promise<AdminResult>,
): Promise<ActionState> {
  let adminUid: string;
  try {
    adminUid = (await requireAdmin()).uid;
  } catch {
    return SIGN_IN_AGAIN;
  }
  try {
    const result = await change(adminUid);
    if (result.ok) revalidatePath('/admin', 'layout');
    return { status: result.ok ? 'ok' : 'error', message: result.message };
  } catch (error) {
    logger.error('Admin action failed', error, { action: name, id, uid: adminUid });
    return { status: 'error', message: 'That did not work. Try again.' };
  }
}

function text(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function saveWeddingDetailsAsAdmin(
  id: string,
  _state: SaveState,
  form: FormData,
): Promise<SaveState> {
  let adminUid: string;
  try {
    adminUid = (await requireAdmin()).uid;
  } catch {
    return { status: 'error', message: SIGN_IN_AGAIN_MESSAGE };
  }
  try {
    const fields = Object.fromEntries(
      [...form.entries()].filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
    const result = await editWeddingDetails(id, fields, adminUid);
    if (result.ok) {
      revalidatePath('/admin', 'layout');
      return { status: 'saved' };
    }
    return {
      status: 'error',
      message: result.message,
      ...(result.errors !== undefined && { errors: result.errors }),
    };
  } catch (error) {
    logger.error('Admin save failed', error, { id, uid: adminUid });
    return { status: 'error', message: 'Your changes were not saved. Try again.' };
  }
}

export async function changeWeddingPhoneAction(
  id: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  // Ten digits mean an Indian mobile; anything with a + is read as typed.
  const typed = text(form, 'phone');
  const phone = typed.startsWith('+')
    ? { ok: true as const, e164: typed.replace(/[\s-]/g, '') }
    : toE164('IN', typed);
  if (!phone.ok) return { status: 'error', message: phone.message };
  return run('change-phone', id, (uid) => changeWeddingPhone(id, phone.e164, uid));
}

export async function changeWeddingAddressAction(
  id: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const slug = text(form, 'slug').toLowerCase();
  return run('change-address', id, (uid) => changeWeddingAddress(id, slug, uid));
}

export async function pauseWeddingAction(id: string): Promise<ActionState> {
  return run('pause', id, (uid) => setWeddingStatus(id, 'unavailable', uid));
}

export async function resumeWeddingAction(id: string): Promise<ActionState> {
  return run('resume', id, (uid) => setWeddingStatus(id, 'live', uid));
}

export async function deleteWeddingAction(id: string): Promise<ActionState> {
  return run('delete-wedding', id, (uid) => deleteWedding(id, uid));
}

export async function restoreWeddingAction(id: string): Promise<ActionState> {
  return run('restore-wedding', id, (uid) => restoreWedding(id, uid));
}

export async function releaseAddressAction(id: string): Promise<ActionState> {
  return run('release-address', id, (uid) => releaseWeddingAddress(id, uid));
}

export async function reactivatePreviewAction(id: string): Promise<ActionState> {
  return run('reactivate-preview', id, (uid) => reactivatePreview(id, uid));
}

export async function deleteLeadAction(id: string): Promise<ActionState> {
  return run('delete-lead', id, (uid) => deleteLead(id, uid));
}

export async function restoreLeadAction(id: string): Promise<ActionState> {
  return run('restore-lead', id, (uid) => restoreLead(id, uid));
}
