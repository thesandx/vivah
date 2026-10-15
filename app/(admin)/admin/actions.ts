'use server';

import { revalidatePath } from 'next/cache';

import type { ActionState } from '@/components/admin/AdminActionForm';
import type { StepUploadStart } from '@/components/admin/StepImageUpload';
import type { SaveState } from '@/components/dashboard/WeddingDetailsForm';
import type { UploadStart } from '@/hooks/useImageUpload';
import { parseStep } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import { toE164 } from '@/lib/phone';
import { parseKind } from '@/lib/testimonials';
import { parseSongSlot } from '@/lib/wedding-songs';
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
import {
  createStepImageUpload,
  resetStepImage,
  saveStepImage,
} from '@/services/site-content.service';
import { createTestimonialUpload, saveBanner, storeFor } from '@/services/testimonials.service';
import { createSongUpload, removeSong, saveSong } from '@/services/wedding-songs.service';

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

/**
 * Step 1 of a "How it works" image upload: a signed URL the browser sends
 * the image to. The URL is a bearer credential for ten minutes, so it goes
 * only to an admin session.
 */
export async function startStepImageUploadAction(
  rawStep: number,
  contentType: string,
): Promise<StepUploadStart> {
  let adminUid: string;
  try {
    adminUid = (await requireAdmin()).uid;
  } catch {
    return { status: 'error', message: SIGN_IN_AGAIN_MESSAGE };
  }
  const step = parseStep(rawStep);
  if (step === null) return { status: 'error', message: 'That step does not exist.' };
  try {
    return { status: 'ok', upload: await createStepImageUpload(step, contentType) };
  } catch (error) {
    logger.error('Signing a How it works upload failed', error, { step, uid: adminUid });
    return { status: 'error', message: 'Use a JPEG, PNG or WebP image, then try again.' };
  }
}

/** Step 2: checks the uploaded image and puts it on the home page. */
export async function saveStepImageAction(rawStep: number, tmpPath: string): Promise<ActionState> {
  const step = parseStep(rawStep);
  if (step === null) return { status: 'error', message: 'That step does not exist.' };
  return run('home-image', String(step), (uid) => saveStepImage(step, tmpPath, uid));
}

export async function resetStepImageAction(rawStep: number): Promise<ActionState> {
  const step = parseStep(rawStep);
  if (step === null) return { status: 'error', message: 'That step does not exist.' };
  return run('home-image-reset', String(step), (uid) => resetStepImage(step, uid));
}

/**
 * Step 1 of a chat screenshot or couple photo upload: a signed URL the
 * browser sends the image to. Admin only, like the step images.
 */
export async function startTestimonialUploadAction(
  rawKind: string,
  contentType: string,
): Promise<UploadStart> {
  let adminUid: string;
  try {
    adminUid = (await requireAdmin()).uid;
  } catch {
    return { status: 'error', message: SIGN_IN_AGAIN_MESSAGE };
  }
  const kind = parseKind(rawKind);
  if (kind === null) return { status: 'error', message: 'That list does not exist.' };
  try {
    return { status: 'ok', upload: await createTestimonialUpload(kind, contentType) };
  } catch (error) {
    logger.error('Signing a testimonial upload failed', error, { kind, uid: adminUid });
    return { status: 'error', message: 'Use a JPEG, PNG or WebP image, then try again.' };
  }
}

/** The typed fields of a chat or review form, as zod reads them. */
function testimonialFields(form: FormData): Record<string, string> {
  return Object.fromEntries(
    ['message', 'caption', 'app', 'quote', 'names', 'relation', 'stars'].map((key) => [
      key,
      text(form, key),
    ]),
  );
}

/**
 * Step 2: saves the words, and the uploaded image when there is one. A new
 * item (`id` is `null`) needs an image; an edit keeps its image without one.
 */
export async function saveTestimonialAction(
  rawKind: string,
  id: string | null,
  tmpPath: string | null,
  form: FormData,
): Promise<ActionState> {
  const kind = parseKind(rawKind);
  if (kind === null) return { status: 'error', message: 'That list does not exist.' };
  const store = storeFor(kind);
  const fields = testimonialFields(form);
  if (id === null) {
    if (tmpPath === null) return { status: 'error', message: 'Choose an image first.' };
    return run('testimonial-add', kind, (uid) => store.add(fields, tmpPath, uid));
  }
  return run('testimonial-edit', id, (uid) => store.edit(id, fields, tmpPath, uid));
}

export async function removeTestimonialAction(rawKind: string, id: string): Promise<ActionState> {
  const kind = parseKind(rawKind);
  if (kind === null) return { status: 'error', message: 'That list does not exist.' };
  return run('testimonial-remove', id, (uid) => storeFor(kind).remove(id, uid));
}

export async function moveTestimonialAction(
  rawKind: string,
  id: string,
  direction: 'up' | 'down',
): Promise<ActionState> {
  const kind = parseKind(rawKind);
  if (kind === null) return { status: 'error', message: 'That list does not exist.' };
  if (direction !== 'up' && direction !== 'down') {
    return { status: 'error', message: 'That is not a direction.' };
  }
  return run('testimonial-move', id, (uid) => storeFor(kind).move(id, direction, uid));
}

export async function saveBannerAction(_state: ActionState, form: FormData): Promise<ActionState> {
  return run('banner', 'home-banner', (uid) =>
    saveBanner({ headline: text(form, 'headline') }, uid),
  );
}

export async function hideBannerAction(): Promise<ActionState> {
  return run('banner-hide', 'home-banner', (uid) => saveBanner({ headline: '' }, uid));
}

/**
 * Step 1 of a wedding song upload: a signed URL the browser sends the audio
 * file to. Admin only, like the images.
 */
export async function startSongUploadAction(
  rawSlot: number,
  contentType: string,
): Promise<UploadStart> {
  let adminUid: string;
  try {
    adminUid = (await requireAdmin()).uid;
  } catch {
    return { status: 'error', message: SIGN_IN_AGAIN_MESSAGE };
  }
  const slot = parseSongSlot(rawSlot);
  if (slot === null) return { status: 'error', message: 'That song does not exist.' };
  try {
    return { status: 'ok', upload: await createSongUpload(slot, contentType) };
  } catch (error) {
    logger.error('Signing a song upload failed', error, { slot, uid: adminUid });
    return { status: 'error', message: 'Use an MP3, M4A, AAC or Ogg file, then try again.' };
  }
}

/** Step 2: saves the name, and the uploaded file when there is one. */
export async function saveSongAction(
  rawSlot: number,
  name: string,
  tmpPath: string | null,
): Promise<ActionState> {
  const slot = parseSongSlot(rawSlot);
  if (slot === null) return { status: 'error', message: 'That song does not exist.' };
  return run('song', String(slot), (uid) => saveSong(slot, name, tmpPath, uid));
}

export async function removeSongAction(rawSlot: number): Promise<ActionState> {
  const slot = parseSongSlot(rawSlot);
  if (slot === null) return { status: 'error', message: 'That song does not exist.' };
  return run('song-remove', String(slot), (uid) => removeSong(slot, uid));
}
