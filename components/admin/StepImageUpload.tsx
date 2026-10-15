'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';

import type { ActionState } from '@/components/admin/AdminActionForm';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { MAX_STEP_IMAGE_BYTES, STEP_IMAGE_WIDTH } from '@/lib/how-it-works';

/**
 * Uploads a new phone screen for one "How it works" step on the home page.
 *
 * The browser shrinks the picture to `STEP_IMAGE_WIDTH` pixels wide first,
 * as WebP where the browser can write it and JPEG where it cannot. A phone
 * screenshot of several megabytes becomes about 100 KB, so the home page
 * stays fast. Then the usual three steps: a signed URL from the server, a
 * PUT straight to the bucket, and a check on the server that promotes it.
 * See `services/storage.service.ts`.
 *
 * `'use client'` for the file picker, the canvas and the upload.
 */

export type StepUploadStart =
  | {
      status: 'ok';
      upload: { url: string; tmpPath: string; headers: Record<string, string> };
    }
  | { status: 'error'; message: string };

export interface StepImageUploadProps {
  /** Server Action, bound to the step: a signed URL for an image of this type. */
  startUpload: (contentType: string) => Promise<StepUploadStart>;
  /** Server Action, bound to the step: checks the upload and makes it live. */
  saveUpload: (tmpPath: string) => Promise<ActionState>;
}

/** The upload gives up after this. A minute is long on a slow connection. */
const UPLOAD_TIMEOUT_MS = 60 * 1000;

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
}

/** Shrinks `file` to the width the phone frame needs. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, STEP_IMAGE_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('This browser cannot resize images.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Safari writes PNG when asked for WebP, so check what came back.
  const webp = await canvasToBlob(canvas, 'image/webp');
  if (webp !== null && webp.type === 'image/webp') return webp;
  const jpeg = await canvasToBlob(canvas, 'image/jpeg');
  if (jpeg === null) throw new Error('This browser cannot resize images.');
  return jpeg;
}

export function StepImageUpload({
  startUpload,
  saveUpload,
}: StepImageUploadProps): React.JSX.Element {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ActionState>({ status: 'idle' });

  async function upload(file: File): Promise<void> {
    setPending(true);
    setState({ status: 'idle' });
    try {
      const image = await shrink(file);
      if (image.size > MAX_STEP_IMAGE_BYTES) {
        setState({ status: 'error', message: 'That image is too large. Crop it and try again.' });
        return;
      }
      const started = await startUpload(image.type);
      if (started.status === 'error') {
        setState(started);
        return;
      }
      const response = await fetch(started.upload.url, {
        method: 'PUT',
        headers: started.upload.headers,
        body: image,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      });
      if (!response.ok) {
        setState({ status: 'error', message: 'The upload did not finish. Try again.' });
        return;
      }
      const saved = await saveUpload(started.upload.tmpPath);
      setState(saved);
      if (saved.status === 'ok') router.refresh();
    } catch {
      setState({ status: 'error', message: 'That image did not upload. Try another one.' });
    } finally {
      setPending(false);
      if (inputRef.current !== null) inputRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) void upload(file);
        }}
      />
      <Button
        variant="primary"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className="sm:self-start"
      >
        {pending ? 'Uploading…' : 'Upload a new image'}
      </Button>
      {state.status !== 'idle' && (
        <Alert tone={state.status === 'ok' ? 'success' : 'danger'} title={state.message} />
      )}
    </div>
  );
}
