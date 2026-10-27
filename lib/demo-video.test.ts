import { describe, expect, it } from 'vitest';

import {
  type ByteReader,
  demoFilename,
  demoVideoRoute,
  isDemoContentType,
  isDemoFilename,
  isDemoFilenameFor,
  isFastStart,
  parseDemoUploadKind,
  parseSiteVideoSlot,
  siteVideoDocId,
  siteVideoFolder,
} from '@/lib/demo-video';

/** An MP4 box: a 32-bit size, a four-letter type, and `body` zero bytes. */
function box(type: string, body: number): Uint8Array {
  const bytes = new Uint8Array(8 + body);
  new DataView(bytes.buffer).setUint32(0, 8 + body);
  bytes.set(
    [...type].map((c) => c.charCodeAt(0)),
    4,
  );
  return bytes;
}

/** A box with a 64-bit size (`size` field 1). */
function largeBox(type: string, body: number): Uint8Array {
  const bytes = new Uint8Array(16 + body);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 1);
  bytes.set(
    [...type].map((c) => c.charCodeAt(0)),
    4,
  );
  view.setBigUint64(8, BigInt(16 + body));
  return bytes;
}

function file(...boxes: Uint8Array[]): { read: ByteReader; size: number } {
  const all = new Uint8Array(boxes.reduce((n, b) => n + b.length, 0));
  let at = 0;
  for (const b of boxes) {
    all.set(b, at);
    at += b.length;
  }
  return { read: async (start, length) => all.slice(start, start + length), size: all.length };
}

describe('demo video', () => {
  it('reads the upload kind', () => {
    expect(parseDemoUploadKind('video')).toBe('video');
    expect(parseDemoUploadKind('poster')).toBe('poster');
    expect(parseDemoUploadKind('song')).toBeNull();
  });

  it('names files by kind, and recognises only those names', () => {
    const video = demoFilename('video', 'a1b2-c3d4!');
    const poster = demoFilename('poster', 'zz9');
    expect(video).toBe('demo-video-a1b2c3d4.mp4');
    expect(poster).toBe('demo-poster-zz9.jpg');
    expect(isDemoFilenameFor('video', video)).toBe(true);
    expect(isDemoFilenameFor('poster', video)).toBe(false);
    expect(isDemoFilename(poster)).toBe(true);
    expect(isDemoFilename('../secret.mp4')).toBe(false);
    expect(isDemoFilename('song-1-abc.mp3')).toBe(false);
  });

  it('takes an MP4 video and a JPEG poster only', () => {
    expect(isDemoContentType('video', 'video/mp4')).toBe(true);
    expect(isDemoContentType('video', 'video/quicktime')).toBe(false);
    expect(isDemoContentType('poster', 'image/jpeg')).toBe(true);
    expect(isDemoContentType('poster', 'text/html')).toBe(false);
  });

  it('points the fallback at the signing route', () => {
    expect(demoVideoRoute('demo-video-abc.mp4')).toBe('/api/demo-video/demo-video-abc.mp4');
    expect(demoVideoRoute('demo-video-abc.mp4', 'help-guest-invite')).toBe(
      '/api/demo-video/demo-video-abc.mp4?slot=help-guest-invite',
    );
  });

  it('gives each slot its own document and folder, and keeps the demo where it was', () => {
    expect(siteVideoDocId('demo')).toBe('demo-video');
    expect(siteVideoFolder('demo')).toBe('siteContent/demo-video/');
    expect(siteVideoFolder('help-edit-details')).toBe('siteContent/help-edit-details-video/');
    expect(siteVideoDocId('help-guest-invite')).toBe('help-guest-invite-video');
    expect(siteVideoFolder('help-functions')).toBe('siteContent/help-functions-video/');
  });

  it('reads only the known slots', () => {
    expect(parseSiteVideoSlot('help-edit-details')).toBe('help-edit-details');
    expect(parseSiteVideoSlot('help-functions')).toBe('help-functions');
    expect(parseSiteVideoSlot('help-families')).toBe('help-families');
    expect(parseSiteVideoSlot('users')).toBeNull();
    expect(parseSiteVideoSlot(3)).toBeNull();
  });

  describe('isFastStart', () => {
    it('is true when moov comes before mdat', async () => {
      const f = file(box('ftyp', 16), box('moov', 40), box('mdat', 200));
      expect(await isFastStart(f.read, f.size)).toBe(true);
    });

    it('is false when mdat comes first', async () => {
      const f = file(box('ftyp', 16), box('free', 0), box('mdat', 200), box('moov', 40));
      expect(await isFastStart(f.read, f.size)).toBe(false);
    });

    it('steps over a box with a 64-bit size', async () => {
      const f = file(box('ftyp', 16), largeBox('free', 30), box('moov', 40), box('mdat', 10));
      expect(await isFastStart(f.read, f.size)).toBe(true);
    });

    it('is null for a file that is not an MP4', async () => {
      const f = file(box('RIFF', 20));
      expect(await isFastStart(f.read, f.size)).toBeNull();
      const empty = file();
      expect(await isFastStart(empty.read, empty.size)).toBeNull();
    });

    it('is null for a box size it cannot trust', async () => {
      const broken = box('free', 0);
      new DataView(broken.buffer).setUint32(0, 3);
      const f = file(box('ftyp', 16), broken, box('moov', 8));
      expect(await isFastStart(f.read, f.size)).toBeNull();
    });
  });
});
