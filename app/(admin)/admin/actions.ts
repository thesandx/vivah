'use server';

import { revalidatePath } from 'next/cache';

import type { ActionState } from '@/components/admin/AdminActionForm';
import type { StepUploadStart } from '@/components/admin/StepImageUpload';
import type { FunctionsSaveState } from '@/components/dashboard/FunctionsForm';
import type { SongSaveResult } from '@/components/dashboard/SongPicker';
import type { SaveState } from '@/components/dashboard/WeddingDetailsForm';
import type { UploadStart } from '@/hooks/useImageUpload';
import { parseNameOrder } from '@/lib/couple-names';
import { parseDemoUploadKind, parseSiteVideoSlot } from '@/lib/demo-video';
import { parseStep } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import { toE164 } from '@/lib/phone';
import { parseSampleVenuesForm } from '@/lib/sample-invite';
import { ERASE_CONFIRM_WORD, parseEraseIds } from '@/lib/test-data-cleanup';
import { parseKind } from '@/lib/testimonials';
import { parseSongSlot } from '@/lib/wedding-songs';
import {
  type AdminResult,
  changePreviewFunctions,
  changePreviewNameOrder,
  changePreviewSong,
  changeWeddingAddress,
  changeWeddingPhone,
  deleteLead,
  deleteWedding,
  editWeddingDetails,
  editWeddingFunctions,
  eraseTestData,
  makePreviewLive,
  reactivatePreview,
  releaseWeddingAddress,
  restoreLead,
  restoreWedding,
  setWeddingStatus,
} from '@/services/admin.service';
import { requireAdmin } from '@/services/admin-session.service';
import { createCoupon, saveRibbon, setCouponActive } from '@/services/coupon.service';
import {
  createDemoVideoUpload,
  removeDemoVideo,
  saveDemoVideo,
} from '@/services/demo-video.service';
import { resetSampleVenues, saveSampleVenues } from '@/services/sample-invite.service';
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

export async function saveWeddingFunctionsAsAdmin(
  id: string,
  _state: FunctionsSaveState,
  form: FormData,
): Promise<FunctionsSaveState> {
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
    const result = await editWeddingFunctions(id, fields, adminUid);
    if (result.ok) {
      revalidatePath('/admin', 'layout');
      return { status: 'saved' };
    }
    return {
      status: 'error',
      message: result.message,
      ...(result.fieldErrors !== undefined && { errors: result.fieldErrors }),
    };
  } catch (error) {
    logger.error('Admin functions save failed', error, { id, uid: adminUid });
    return { status: 'error', message: 'Your changes were not saved. Try again.' };
  }
}

/** Changes which functions an unpaid preview shows. */
export async function changePreviewFunctionsAction(
  id: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const kinds = form.getAll('functions');
  return run('preview-functions', id, (uid) => changePreviewFunctions(id, kinds, uid));
}

/** Sets whose name a preview shows first, and its live invite's when paid. */
export async function changePreviewNameOrderAction(
  id: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const nameOrder = parseNameOrder(text(form, 'nameOrder'));
  if (nameOrder === null) return { status: 'error', message: 'Choose whose name comes first.' };
  return run('preview-name-order', id, (uid) => changePreviewNameOrder(id, nameOrder, uid));
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

export async function restoreWeddingAction(
  id: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const slug = text(form, 'slug').toLowerCase();
  return run('restore-wedding', id, (uid) => restoreWedding(id, slug, uid));
}

export async function releaseAddressAction(id: string): Promise<ActionState> {
  return run('release-address', id, (uid) => releaseWeddingAddress(id, uid));
}

export async function reactivatePreviewAction(id: string): Promise<ActionState> {
  return run('reactivate-preview', id, (uid) => reactivatePreview(id, uid));
}

/** Makes a preview live at the typed address, with no payment on the site. */
export async function makePreviewLiveAction(
  id: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const slug = text(form, 'slug').toLowerCase();
  const coupon = text(form, 'coupon');
  return run('make-live', id, (uid) => makePreviewLive(id, slug, uid, coupon));
}

export async function deleteLeadAction(id: string): Promise<ActionState> {
  return run('delete-lead', id, (uid) => deleteLead(id, uid));
}

export async function restoreLeadAction(id: string): Promise<ActionState> {
  return run('restore-lead', id, (uid) => restoreLead(id, uid));
}

/**
 * "Clear test data": erases the ticked previews and deleted invites for
 * good (ADR-0016). Acts only when the admin typed the confirm word.
 */
export async function eraseTestDataAction(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (text(form, 'confirm').toUpperCase() !== ERASE_CONFIRM_WORD) {
    return { status: 'error', message: `Type ${ERASE_CONFIRM_WORD} to confirm. Nothing changed.` };
  }
  const leadIds = parseEraseIds(form.getAll('lead'));
  const weddingIds = parseEraseIds(form.getAll('wedding'));
  if (leadIds.length === 0 && weddingIds.length === 0) {
    return { status: 'error', message: 'Tick at least one row. Nothing changed.' };
  }
  return run('erase-test-data', 'bulk', async (uid) => {
    const result = await eraseTestData(leadIds, weddingIds, uid);
    const kept = result.kept === 0 ? '' : ` Kept ${result.kept} that are live.`;
    return {
      ok: true,
      message: `Erased ${result.erasedLeads} previews and ${result.erasedWeddings} deleted invites.${kept}`,
    };
  });
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

/** Changes one preview's song, and its live invite's when the couple has paid. */
export async function changePreviewSongAction(
  id: string,
  rawSlot: unknown,
): Promise<SongSaveResult> {
  const slot = parseSongSlot(rawSlot);
  if (slot === null) return { ok: false, message: 'Choose one of the songs.' };
  const state = await run('preview-song', id, (uid) => changePreviewSong(id, slot, uid));
  return { ok: state.status === 'ok', message: state.status === 'idle' ? '' : state.message };
}

export async function removeSongAction(rawSlot: number): Promise<ActionState> {
  const slot = parseSongSlot(rawSlot);
  if (slot === null) return { status: 'error', message: 'That song does not exist.' };
  return run('song-remove', String(slot), (uid) => removeSong(slot, uid));
}

const NO_SLOT = 'That video does not exist.';

/**
 * Step 1 of a video upload (the home page's demo or a `/help` video): a
 * signed URL the browser sends the video, or its poster, to. Admin only, like
 * the songs. `/admin` binds `rawSlot`.
 */
export async function startDemoVideoUploadAction(
  rawSlot: string,
  rawKind: string,
  contentType: string,
): Promise<UploadStart> {
  let adminUid: string;
  try {
    adminUid = (await requireAdmin()).uid;
  } catch {
    return { status: 'error', message: SIGN_IN_AGAIN_MESSAGE };
  }
  const slot = parseSiteVideoSlot(rawSlot);
  if (slot === null) return { status: 'error', message: NO_SLOT };
  const kind = parseDemoUploadKind(rawKind);
  if (kind === null) return { status: 'error', message: 'That upload is not part of the video.' };
  try {
    return { status: 'ok', upload: await createDemoVideoUpload(kind, contentType, slot) };
  } catch (error) {
    logger.error('Signing a demo video upload failed', error, { slot, kind, uid: adminUid });
    return { status: 'error', message: 'Use an MP4 video, then try again.' };
  }
}

/** Step 2: checks the uploaded video and poster, and puts them on the slot's page. */
export async function saveDemoVideoAction(
  rawSlot: string,
  videoTmpPath: string,
  posterTmpPath: string | null,
): Promise<ActionState> {
  const slot = parseSiteVideoSlot(rawSlot);
  if (slot === null) return { status: 'error', message: NO_SLOT };
  return run('demo-video', slot, (uid) => saveDemoVideo(videoTmpPath, posterTmpPath, uid, slot));
}

export async function removeDemoVideoAction(rawSlot: string): Promise<ActionState> {
  const slot = parseSiteVideoSlot(rawSlot);
  if (slot === null) return { status: 'error', message: NO_SLOT };
  return run('demo-video-remove', slot, (uid) => removeDemoVideo(uid, slot));
}

/** Makes a coupon from the Coupons tab's form. ADR-0015. */
export async function createCouponAction(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const fields = {
    code: text(form, 'code'),
    percentOff: text(form, 'percentOff'),
    note: text(form, 'note'),
  };
  return run('coupon-create', fields.code, (uid) => createCoupon(fields, uid));
}

export async function turnCouponOnAction(id: string): Promise<ActionState> {
  return run('coupon-on', id, (uid) => setCouponActive(id, true, uid));
}

export async function turnCouponOffAction(id: string): Promise<ActionState> {
  return run('coupon-off', id, (uid) => setCouponActive(id, false, uid));
}

/** Shows the home page ribbon with the chosen coupon. */
export async function saveRibbonAction(_state: ActionState, form: FormData): Promise<ActionState> {
  const code = text(form, 'coupon');
  if (code === '') return { status: 'error', message: 'Choose a coupon to show.' };
  return run('ribbon', 'home-ribbon', (uid) => saveRibbon(code, uid));
}

export async function hideRibbonAction(): Promise<ActionState> {
  return run('ribbon-hide', 'home-ribbon', (uid) => saveRibbon(null, uid));
}

/** Saves the sample invite's venues, names, addresses and map links. */
export async function saveSampleVenuesAction(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = parseSampleVenuesForm(form);
  if (!parsed.ok) return { status: 'error', message: parsed.message };
  return run('sample-venues', 'sample-invite', (uid) => saveSampleVenues(parsed.venues, uid));
}

/** Puts the sample invite's default Delhi venues back. */
export async function resetSampleVenuesAction(): Promise<ActionState> {
  return run('sample-venues-reset', 'sample-invite', (uid) => resetSampleVenues(uid));
}
