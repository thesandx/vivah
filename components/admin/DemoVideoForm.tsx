'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';

import type { ActionState } from '@/components/admin/AdminActionForm';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import type { UploadStart } from '@/hooks/useImageUpload';
import {
  isFastStart,
  MAX_DEMO_POSTER_BYTES,
  MAX_DEMO_VIDEO_BYTES,
  SLOW_DEMO_VIDEO_BYTES,
} from '@/lib/demo-video';

/**
 * The home page's demo video: pick an MP4, check it, and upload it with a
 * poster. The file goes straight to the bucket with a signed URL, then the
 * server checks it and puts it on the home page.
 *
 * Before the upload, the browser checks that the MP4 is "fast start", so a
 * phone can play it while it downloads, and draws one frame as the poster,
 * which shows at once when a visitor opens the video.
 *
 * `'use client'` for the file picker, the checks, the canvas and the upload.
 */

export interface DemoVideoFormProps {
  /** The video on the home page now, or `null` when there is none. */
  current: { src: string; poster: string } | null;
  /** Server Action: a signed URL for the video (`'video'`) or its poster (`'poster'`). */
  startUpload: (kind: string, contentType: string) => Promise<UploadStart>;
  /** Server Action: checks the uploads and saves them. */
  save: (videoTmpPath: string, posterTmpPath: string | null) => Promise<ActionState>;
}

/** The upload gives up after this. 40 MB on a slow line takes a few minutes. */
const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;
/** Drawing the poster gives up after this, and the video goes up without one. */
const POSTER_TIMEOUT_MS = 10 * 1000;
/** The poster's width. The video plays at most 288px wide, so 720 is sharp on any phone. */
const POSTER_WIDTH = 720;
/** Where the poster frame is taken, in seconds, when the video is long enough. */
const POSTER_AT_S = 2.2;

const MB = 1024 * 1024;

/** One frame of `file` as a JPEG, or `null` when the browser cannot draw it. */
function drawPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    const timer = window.setTimeout(() => finish(null), POSTER_TIMEOUT_MS);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('error', () => finish(null));
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = Math.min(POSTER_AT_S, video.duration / 2);
    });
    video.addEventListener('seeked', () => {
      const scale = POSTER_WIDTH / video.videoWidth;
      const canvas = document.createElement('canvas');
      canvas.width = POSTER_WIDTH;
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext('2d');
      if (context === null) {
        finish(null);
        return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          window.clearTimeout(timer);
          finish(blob !== null && blob.size <= MAX_DEMO_POSTER_BYTES ? blob : null);
        },
        'image/jpeg',
        0.82,
      );
    });
    video.src = url;
  });
}

/** Some browsers give an MP4 no type. */
function isMp4(file: File): boolean {
  return file.type === 'video/mp4' || (file.type === '' && /\.mp4$/i.test(file.name));
}

type Checked =
  | { status: 'none' }
  | { status: 'checking' }
  | { status: 'bad'; message: string }
  | { status: 'ready'; file: File; poster: Blob | null; posterUrl: string; slow: boolean };

async function check(file: File): Promise<Checked> {
  if (!isMp4(file)) return { status: 'bad', message: 'Use an MP4 video.' };
  if (file.size > MAX_DEMO_VIDEO_BYTES) {
    return { status: 'bad', message: 'That video is over 40 MB. Export a smaller one (720p).' };
  }
  const fast = await isFastStart(
    async (start, length) => new Uint8Array(await file.slice(start, start + length).arrayBuffer()),
    file.size,
  );
  if (fast === null) return { status: 'bad', message: 'That file does not look like an MP4.' };
  if (!fast) {
    return {
      status: 'bad',
      message:
        'This MP4 is not set up for fast start, so a phone would wait for the whole file. Export it again with "Optimize for web" (or "Fast start") turned on.',
    };
  }
  const poster = await drawPoster(file);
  return {
    status: 'ready',
    file,
    poster,
    posterUrl: poster === null ? '' : URL.createObjectURL(poster),
    slow: file.size > SLOW_DEMO_VIDEO_BYTES,
  };
}

async function put(start: UploadStart, body: Blob): Promise<string | null> {
  if (start.status === 'error') return null;
  const response = await fetch(start.upload.url, {
    method: 'PUT',
    headers: start.upload.headers,
    body,
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });
  return response.ok ? start.upload.tmpPath : null;
}

export function DemoVideoForm({
  current,
  startUpload,
  save,
}: DemoVideoFormProps): React.JSX.Element {
  const fileId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [checked, setChecked] = useState<Checked>({ status: 'none' });
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ActionState>({ status: 'idle' });

  async function choose(file: File | null): Promise<void> {
    setState({ status: 'idle' });
    if (checked.status === 'ready' && checked.posterUrl !== '') {
      URL.revokeObjectURL(checked.posterUrl);
    }
    if (file === null) {
      setChecked({ status: 'none' });
      return;
    }
    setChecked({ status: 'checking' });
    setChecked(await check(file));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (checked.status !== 'ready') return;
    setPending(true);
    setState({ status: 'idle' });
    try {
      const started = await startUpload('video', 'video/mp4');
      if (started.status === 'error') {
        setState(started);
        return;
      }
      const videoTmp = await put(started, checked.file);
      if (videoTmp === null) {
        setState({ status: 'error', message: 'The upload did not finish. Try again.' });
        return;
      }
      // The poster is a nicety: without it, the video still goes up.
      const poster = checked.poster;
      const posterTmp =
        poster === null
          ? null
          : await startUpload('poster', 'image/jpeg')
              .then((start) => put(start, poster))
              .catch(() => null);
      const saved = await save(videoTmp, posterTmp);
      setState(saved);
      if (saved.status === 'ok') {
        setChecked({ status: 'none' });
        if (fileInput.current !== null) fileInput.current.value = '';
        router.refresh();
      }
    } catch {
      setState({ status: 'error', message: 'That video did not save. Try again.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSave(event);
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      {current !== null && (
        <video
          controls
          playsInline
          preload="none"
          src={current.src}
          {...(current.poster !== '' && { poster: current.poster })}
          className="bg-sunken rounded-card aspect-9/16 w-40"
        >
          <p>Your browser cannot play this video.</p>
        </video>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fileId} className="text-small font-medium">
          {current === null ? 'Video file' : 'Replace the video'}
        </label>
        <input
          ref={fileInput}
          id={fileId}
          type="file"
          accept="video/mp4,.mp4"
          className="text-small file:border-line file:rounded-pill file:bg-surface file:text-ink file:mr-3 file:min-h-11 file:border-2 file:px-4"
          onChange={(event) => {
            void choose(event.target.files?.[0] ?? null);
          }}
        />
        <p className="text-small text-ink-soft">
          MP4, portrait 9:16, 720p, with fast start. Up to 40 MB; under {SLOW_DEMO_VIDEO_BYTES / MB}{' '}
          MB starts fastest on a phone.
        </p>
      </div>
      {checked.status === 'checking' && <p className="text-small">Checking the video…</p>}
      {checked.status === 'bad' && <Alert tone="danger" title={checked.message} />}
      {checked.status === 'ready' && (
        <div className="flex items-start gap-4">
          {checked.posterUrl !== '' && (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob URL; next/image cannot load it
            <img
              src={checked.posterUrl}
              alt="The poster, taken from the video"
              className="bg-sunken rounded-card aspect-9/16 w-24 object-cover"
            />
          )}
          <p className="text-small text-ink-soft">
            {(checked.file.size / MB).toFixed(1)} MB, fast start.{' '}
            {checked.poster === null
              ? 'The poster could not be drawn, so the video goes up without one.'
              : 'This frame shows until the video plays.'}
            {checked.slow && ' It is large, so it starts slower on a phone.'}
          </p>
        </div>
      )}
      <Button
        type="submit"
        variant="primary"
        disabled={checked.status !== 'ready' || pending}
        className="sm:self-start"
      >
        {pending ? 'Uploading…' : 'Upload video'}
      </Button>
      {state.status !== 'idle' && (
        <Alert tone={state.status === 'ok' ? 'success' : 'danger'} title={state.message} />
      )}
    </form>
  );
}
