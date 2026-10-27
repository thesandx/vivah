import 'server-only';

import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { SITE_CONTENT_COLLECTION } from '@/lib/how-it-works';
import { logger } from '@/lib/logger';
import { isTmpPath, parseObjectPath, TMP_PREFIX } from '@/lib/storage-paths';
import { withTimeout } from '@/lib/utils';
import {
  type ChosenSong,
  chosenSongSchema,
  isSongAudioType,
  isSongFilename,
  isSongFilenameFor,
  MAX_SONG_BYTES,
  SONG_AUDIO_TYPES,
  SONG_SLOTS,
  songFilename,
  type SongOption,
  SONGS_DOC_ID,
  SONGS_FOLDER,
  type SongSlot,
  songUrl,
} from '@/lib/wedding-songs';
import type { AdminResult } from '@/services/admin.service';
import { recordAdminActionIn } from '@/services/admin-audit.service';
import { createRepository } from '@/services/repository';
import {
  createSignedReadUrl,
  createSignedUploadUrl,
  finalizeUpload,
  type SignedUpload,
} from '@/services/storage.service';

/**
 * The wedding songs on step 4 of the sign-up card. See `lib/wedding-songs.ts`.
 *
 * One document, `siteContent/wedding-songs`, holds the four slots. Each is
 * `{ name, file }` or `null`. The id is fixed because the card reads it by
 * key; an admin writes it a few times a year, so it is never a hotspot.
 *
 * A replaced or removed song's file stays in the bucket on purpose: couples
 * who chose it keep it on their site.
 */

const slotSchema = chosenSongSchema.nullable();

const songsSchema = z.object({
  slot1: slotSchema,
  slot2: slotSchema,
  slot3: slotSchema,
  slot4: slotSchema,
});

type Songs = z.infer<typeof songsSchema>;

const EMPTY: Songs = { slot1: null, slot2: null, slot3: null, slot4: null };

export const weddingSongs = createRepository({
  collection: SITE_CONTENT_COLLECTION,
  schema: songsSchema,
});

const ID_OPTIONS = { minLength: SONGS_DOC_ID.length };

function key(slot: SongSlot): keyof Songs {
  return `slot${slot}`;
}

/** One instance reads the document at most once a minute. */
const CACHE_MS = 60 * 1000;
const READ_TIMEOUT_MS = 3000;

let cached: { at: number; songs: Songs } | null = null;

/** The four slots. `fresh` skips the cache, for `/admin`. */
export async function getSongSlots({ fresh = false } = {}): Promise<Songs> {
  if (!fresh && cached !== null && Date.now() - cached.at < CACHE_MS) return cached.songs;
  const document = await withTimeout(
    weddingSongs.get(SONGS_DOC_ID),
    READ_TIMEOUT_MS,
    'Reading the wedding songs',
  );
  const songs = document === null ? EMPTY : songsSchema.parse(document);
  cached = { at: Date.now(), songs };
  return songs;
}

/** Forgets the cached songs on this instance. For tests, and after a change. */
export function resetSongsCache(): void {
  cached = null;
}

/** The songs a couple can choose from, in slot order. Empty slots are skipped. */
export async function listSongOptions(): Promise<SongOption[]> {
  const songs = await getSongSlots();
  return SONG_SLOTS.flatMap((slot) => {
    const song = songs[key(slot)];
    return song === null ? [] : [{ slot, name: song.name, src: songUrl(song.file) }];
  });
}

/**
 * The song an invite plays: the one the couple chose, or else the first on
 * the admin's list, so no preview or invite is ever silent. The fallback is
 * read, not stored: the couple's own choice still wins the moment they make
 * one. A failed list read gives `null`, and the invite opens without music
 * rather than failing.
 */
export async function inviteSong(
  chosen: ChosenSong | undefined,
): Promise<{ name: string; src: string } | null> {
  if (chosen !== undefined) return { name: chosen.name, src: songUrl(chosen.file) };
  try {
    const [first] = await listSongOptions();
    return first === undefined ? null : { name: first.name, src: first.src };
  } catch (error) {
    logger.error('Reading the songs for an invite failed', error);
    return null;
  }
}

/** The song in `slot` now, to copy onto a lead, or `null` when the slot is empty. */
export async function songInSlot(slot: SongSlot): Promise<ChosenSong | null> {
  return (await getSongSlots())[key(slot)];
}

/**
 * A short-lived URL to play `file` from. Only names `songFilename` made, in
 * the songs folder: anything else in the bucket stays private.
 */
export async function songReadUrl(file: string): Promise<string | null> {
  if (!isSongFilename(file)) return null;
  return createSignedReadUrl(`${SONGS_FOLDER}${file}`);
}

/** Signs an upload URL for a new song in `slot`. Only `/admin` calls this, after `requireAdmin()`. */
export async function createSongUpload(slot: SongSlot, contentType: string): Promise<SignedUpload> {
  if (!isSongAudioType(contentType)) {
    throw new Error(`"${contentType}" is not an audio type the sign-up card takes`);
  }
  return createSignedUploadUrl({
    path: {
      collection: SITE_CONTENT_COLLECTION,
      docId: SONGS_DOC_ID,
      filename: songFilename(slot, contentType, randomUUID()),
    },
    contentType,
    maxBytes: MAX_SONG_BYTES,
    allowedContentTypes: SONG_AUDIO_TYPES,
  });
}

/** Writes `song` (or `null`) to `slot`, with its audit entry, in one transaction. */
async function setSlot(slot: SongSlot, song: ChosenSong | null, adminUid: string): Promise<void> {
  await weddingSongs.runTransaction(async (repo, tx) => {
    const current = await repo.get(SONGS_DOC_ID);
    if (current === null) {
      repo.createWithId(SONGS_DOC_ID, { ...EMPTY, [key(slot)]: song }, ID_OPTIONS);
    } else {
      repo.update(SONGS_DOC_ID, { [key(slot)]: song });
    }
    recordAdminActionIn(tx, {
      action: song === null ? 'song-removed' : 'song-changed',
      targetType: 'site',
      targetId: SONGS_DOC_ID,
      detail:
        song === null
          ? `Removed song ${slot} from the sign-up card.`
          : `Set song ${slot} to "${song.name}".`,
      adminUid,
    });
  });
  resetSongsCache();
}

/**
 * Saves `slot`: the name, and a new file when `tmpPath` is given. Without a
 * file, only the name changes, and the slot must already have one.
 *
 * `tmpPath` came back from the browser, so it is untrusted: it must be a
 * pending upload in the songs folder, named for this slot.
 */
export async function saveSong(
  slot: SongSlot,
  rawName: string,
  tmpPath: string | null,
  adminUid: string,
): Promise<AdminResult> {
  const name = chosenSongSchema.shape.name.safeParse(rawName);
  if (!name.success)
    return { ok: false, message: name.error.issues[0]?.message ?? 'Check the name.' };

  let file: string;
  if (tmpPath === null) {
    const current = (await getSongSlots({ fresh: true }))[key(slot)];
    if (current === null) return { ok: false, message: 'Choose a song file to upload.' };
    file = current.file;
  } else {
    const parts = isTmpPath(tmpPath) ? parseObjectPath(tmpPath.slice(TMP_PREFIX.length)) : null;
    if (
      parts === null ||
      parts.collection !== SITE_CONTENT_COLLECTION ||
      parts.docId !== SONGS_DOC_ID ||
      !isSongFilenameFor(slot, parts.filename)
    ) {
      return { ok: false, message: 'That upload is not for this song. Choose the file again.' };
    }
    await finalizeUpload(tmpPath, undefined, {
      maxBytes: MAX_SONG_BYTES,
      allowedContentTypes: SONG_AUDIO_TYPES,
    });
    file = parts.filename;
  }

  await setSlot(slot, { name: name.data, file }, adminUid);
  return { ok: true, message: `Song ${slot} is saved.` };
}

/** Empties `slot`. The file stays, for the couples who chose it. */
export async function removeSong(slot: SongSlot, adminUid: string): Promise<AdminResult> {
  await setSlot(slot, null, adminUid);
  return { ok: true, message: `Song ${slot} is removed from the sign-up card.` };
}
