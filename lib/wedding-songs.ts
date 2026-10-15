import { z } from 'zod';

import { SITE_CONTENT_COLLECTION } from '@/lib/how-it-works';

/**
 * The wedding songs a couple chooses from on step 4 of the sign-up card.
 * Pure rules, no I/O, so they are tested without a database or a bucket.
 *
 * An admin uploads up to four songs, each with a name, from the Home page
 * tab of `/admin`. The couple's choice is copied to the lead, then to the
 * wedding, as `{ name, file }`. So a song that an admin replaces later stays
 * on the sites that chose it, and its file is never deleted.
 *
 * Only upload a song you have the right to use on a couple's website.
 */

export const SONG_SLOTS = [1, 2, 3, 4] as const;

export type SongSlot = (typeof SONG_SLOTS)[number];

/** The one document that holds the four songs, in `siteContent`. */
export const SONGS_DOC_ID = 'wedding-songs';

/** The folder in the bucket. Every song file lives here and nowhere else. */
export const SONGS_FOLDER = `${SITE_CONTENT_COLLECTION}/${SONGS_DOC_ID}/`;

/** Audio types an admin can upload: MP3, M4A/AAC and Ogg play in every phone browser we support. */
export const SONG_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/ogg',
] as const;

export type SongAudioType = (typeof SONG_AUDIO_TYPES)[number];

/** The largest song the bucket accepts. A 3-minute MP3 at 192 kbps is about 4 MB. */
export const MAX_SONG_BYTES = 10 * 1024 * 1024;

export const MAX_SONG_NAME_LENGTH = 60;

const EXTENSIONS: Record<SongAudioType, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
};

export const songNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter the song name.')
  .max(MAX_SONG_NAME_LENGTH, `Keep the name under ${MAX_SONG_NAME_LENGTH} characters.`);

const FILENAME_PATTERN = /^song-[1-4]-[A-Za-z0-9]{1,24}\.(mp3|m4a|aac|ogg)$/;

/** A song as a lead and a wedding store it. `file` is a name `songFilename` made. */
export const chosenSongSchema = z.object({
  name: songNameSchema,
  file: z.string().regex(FILENAME_PATTERN),
});

export type ChosenSong = z.infer<typeof chosenSongSchema>;

/** A song as the sign-up card lists it. */
export interface SongOption {
  slot: SongSlot;
  name: string;
  /** Where the browser plays it from: `songUrl(file)`. */
  src: string;
}

/** Reads a slot number from a form or a body, or `null` when it is not one. */
export function parseSongSlot(raw: unknown): SongSlot | null {
  const value = typeof raw === 'number' ? raw : Number(raw);
  return SONG_SLOTS.find((slot) => slot === value) ?? null;
}

/** True when `contentType` is one an admin can upload. */
export function isSongAudioType(contentType: string): contentType is SongAudioType {
  return (SONG_AUDIO_TYPES as readonly string[]).includes(contentType);
}

/**
 * The file name for a new upload. `token` makes it unique, so a replaced
 * song never shares a name with the one before it.
 */
export function songFilename(slot: SongSlot, contentType: SongAudioType, token: string): string {
  return `song-${slot}-${token.replace(/[^A-Za-z0-9]/g, '').slice(0, 24)}.${EXTENSIONS[contentType]}`;
}

/** True when `filename` is a song file name, for any slot. */
export function isSongFilename(filename: string): boolean {
  return FILENAME_PATTERN.test(filename);
}

/** True when `filename` is a song file name made for `slot`. */
export function isSongFilenameFor(slot: SongSlot, filename: string): boolean {
  return isSongFilename(filename) && filename.startsWith(`song-${slot}-`);
}

/** The URL a browser plays a song from. The route signs a short-lived bucket URL. */
export function songUrl(file: string): string {
  return `/api/songs/${file}`;
}
