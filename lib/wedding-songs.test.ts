import { describe, expect, it } from 'vitest';

import {
  isSongAudioType,
  isSongFilename,
  isSongFilenameFor,
  parseSongSlot,
  songFilename,
  songUrl,
} from '@/lib/wedding-songs';

describe('wedding songs', () => {
  it('reads a slot from 1 to 4 only', () => {
    expect(parseSongSlot(3)).toBe(3);
    expect(parseSongSlot('4')).toBe(4);
    expect(parseSongSlot(0)).toBeNull();
    expect(parseSongSlot(5)).toBeNull();
    expect(parseSongSlot('x')).toBeNull();
  });

  it('takes audio types, never an image or a page', () => {
    expect(isSongAudioType('audio/mpeg')).toBe(true);
    expect(isSongAudioType('audio/mp4')).toBe(true);
    expect(isSongAudioType('image/png')).toBe(false);
    expect(isSongAudioType('text/html')).toBe(false);
  });

  it('names a file by slot, and recognises only those names', () => {
    const name = songFilename(2, 'audio/mpeg', 'a1b2-c3d4!');
    expect(name).toBe('song-2-a1b2c3d4.mp3');
    expect(isSongFilename(name)).toBe(true);
    expect(isSongFilenameFor(2, name)).toBe(true);
    expect(isSongFilenameFor(1, name)).toBe(false);
    expect(isSongFilename('song-2-a1/../x.mp3')).toBe(false);
    expect(isSongFilename('song-2-abc.html')).toBe(false);
    expect(songFilename(1, 'audio/x-m4a', 'z')).toBe('song-1-z.m4a');
  });

  it('plays from the song route', () => {
    expect(songUrl('song-1-abc.mp3')).toBe('/api/songs/song-1-abc.mp3');
  });
});
