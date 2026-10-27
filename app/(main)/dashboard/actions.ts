'use server';

import { revalidatePath } from 'next/cache';

import type { FamiliesSaveState } from '@/components/dashboard/FamiliesForm';
import type { FunctionsSaveState } from '@/components/dashboard/FunctionsForm';
import type { CreateLinkState, DeleteLinkResult } from '@/components/dashboard/GuestLinks';
import type { SongSaveResult } from '@/components/dashboard/SongPicker';
import { logger } from '@/lib/logger';
import { parseWeddingFamilies } from '@/lib/wedding-families';
import { parseWeddingFunctions } from '@/lib/wedding-functions';
import { parseSongSlot } from '@/lib/wedding-songs';
import { requireUser } from '@/services/auth.service';
import { createGuestLink, deleteGuestLink } from '@/services/guest-link.service';
import {
  updateWeddingFamilies,
  updateWeddingFunctions,
  updateWeddingSong,
} from '@/services/wedding.service';

/**
 * The dashboard's guest-link, song, functions and families writes.
 *
 * `requireUser()` first: a Server Action is a public endpoint, whatever page
 * shows the form. The caller's phone number comes from the verified session,
 * and the service checks that it owns the wedding. A guest's or a family
 * member's name is never logged: it is a person's name, and the uid is
 * enough to trace a request.
 */

/** Every dashboard page that lists the links re-renders with the change. */
function refreshDashboard(slug: string): void {
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/edit/${slug}`);
}

export async function createGuestLinkAction(
  slug: string,
  _state: CreateLinkState,
  form: FormData,
): Promise<CreateLinkState> {
  const user = await requireUser();
  const name = form.get('guestName');
  try {
    const result = await createGuestLink(
      slug,
      user.phoneNumber,
      typeof name === 'string' ? name : '',
    );
    if (!result.ok) return { status: 'error', message: result.message };
    logger.info('Guest link created', { slug, uid: user.uid });
    refreshDashboard(slug);
    return { status: 'created', name: result.link.name, segment: result.link.segment };
  } catch (error) {
    logger.error('Creating a guest link failed', error, { slug, uid: user.uid });
    return { status: 'error', message: 'The link was not made. Try again.' };
  }
}

export async function deleteGuestLinkAction(
  slug: string,
  linkId: string,
): Promise<DeleteLinkResult> {
  const user = await requireUser();
  try {
    const result = await deleteGuestLink(slug, user.phoneNumber, linkId);
    if (!result.ok) return { ok: false, message: result.message };
    logger.info('Guest link deleted', { slug, uid: user.uid });
    refreshDashboard(slug);
    return { ok: true };
  } catch (error) {
    logger.error('Deleting a guest link failed', error, { slug, uid: user.uid });
    return { ok: false, message: 'The link was not deleted. Try again.' };
  }
}

export async function saveSongAction(slug: string, rawSlot: unknown): Promise<SongSaveResult> {
  const user = await requireUser();
  const slot = parseSongSlot(rawSlot);
  if (slot === null) return { ok: false, message: 'Choose one of the songs.' };
  try {
    const result = await updateWeddingSong(slug, user.phoneNumber, slot);
    if (!result.ok) {
      return {
        ok: false,
        message:
          result.reason === 'invalid'
            ? 'That song is no longer on the list. Choose another.'
            : 'This invite is not on your number.',
      };
    }
    logger.info('Wedding song changed', { slug, uid: user.uid, slot });
    refreshDashboard(slug);
    return { ok: true, message: `${result.name} is now your song.` };
  } catch (error) {
    logger.error('Changing the wedding song failed', error, { slug, uid: user.uid });
    return { ok: false, message: 'Your song was not saved. Try again.' };
  }
}

export async function saveFunctionsAction(
  slug: string,
  _state: FunctionsSaveState,
  form: FormData,
): Promise<FunctionsSaveState> {
  const user = await requireUser();
  const fields = Object.fromEntries(
    [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
  const parsed = parseWeddingFunctions(fields);
  if (!parsed.ok) {
    return {
      status: 'error',
      message: 'Some details need a fix. See the fields marked below.',
      errors: parsed.errors,
    };
  }
  try {
    const result = await updateWeddingFunctions(slug, user.phoneNumber, parsed.functions);
    if (!result.ok) return { status: 'error', message: 'This invite is not on your number.' };
    logger.info('Wedding functions saved', {
      slug,
      uid: user.uid,
      count: parsed.functions.length,
    });
    refreshDashboard(slug);
    return { status: 'saved' };
  } catch (error) {
    logger.error('Saving wedding functions failed', error, { slug, uid: user.uid });
    return { status: 'error', message: 'Your functions were not saved. Try again.' };
  }
}

export async function saveFamiliesAction(
  slug: string,
  _state: FamiliesSaveState,
  form: FormData,
): Promise<FamiliesSaveState> {
  const user = await requireUser();
  const fields = Object.fromEntries(
    [...form.entries()].filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
  const parsed = parseWeddingFamilies(fields);
  if (!parsed.ok) {
    return {
      status: 'error',
      message: 'Some names need a fix. See the fields marked below.',
      errors: parsed.errors,
    };
  }
  try {
    const result = await updateWeddingFamilies(slug, user.phoneNumber, parsed.families);
    if (!result.ok) return { status: 'error', message: 'This invite is not on your number.' };
    logger.info('Wedding families saved', { slug, uid: user.uid });
    refreshDashboard(slug);
    return { status: 'saved' };
  } catch (error) {
    logger.error('Saving wedding families failed', error, { slug, uid: user.uid });
    return { status: 'error', message: 'Your family names were not saved. Try again.' };
  }
}
