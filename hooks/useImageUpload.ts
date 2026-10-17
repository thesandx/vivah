'use client';

import { useCallback } from 'react';

import { actionErrorMessage } from '@/lib/action-errors';

/**
 * Uploads one image from an admin page straight to the bucket.
 *
 * The browser shrinks the picture to `width` pixels wide first, as WebP where
 * the browser can write it and JPEG where it cannot. A phone photo of several
 * megabytes becomes about 100 KB, so the home page stays fast. Then the usual
 * steps: a signed URL from the server, and a PUT straight to the bucket. The
 * caller sends the returned `tmpPath` to a Server Action, which checks the
 * upload and promotes it. See `services/storage.service.ts`.
 */

/** What a Server Action that signs an upload answers. */
export type UploadStart =
  | {
      status: 'ok';
      upload: { url: string; tmpPath: string; headers: Record<string, string> };
    }
  | { status: 'error'; message: string };

export type UploadResult = { status: 'ok'; tmpPath: string } | { status: 'error'; message: string };

export interface ImageUploadOptions {
  /** Server Action: a signed URL for an image of this type. */
  startUpload: (contentType: string) => Promise<UploadStart>;
  /** The width to shrink to, in pixels. */
  width: number;
  /** The largest file the bucket takes, in bytes. */
  maxBytes: number;
}

/** The upload gives up after this. A minute is long on a slow connection. */
const UPLOAD_TIMEOUT_MS = 60 * 1000;

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
}

/** Shrinks `file` to `width` pixels wide, or leaves it as wide as it is. */
export async function shrinkImage(file: Blob, width: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, width / bitmap.width);
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

export function useImageUpload({
  startUpload,
  width,
  maxBytes,
}: ImageUploadOptions): (file: File) => Promise<UploadResult> {
  return useCallback(
    async (file: File): Promise<UploadResult> => {
      try {
        const image = await shrinkImage(file, width);
        if (image.size > maxBytes) {
          return { status: 'error', message: 'That image is too large. Crop it and try again.' };
        }
        const started = await startUpload(image.type);
        if (started.status === 'error') return started;
        const response = await fetch(started.upload.url, {
          method: 'PUT',
          headers: started.upload.headers,
          body: image,
          signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
        });
        if (!response.ok) {
          return { status: 'error', message: 'The upload did not finish. Try again.' };
        }
        return { status: 'ok', tmpPath: started.upload.tmpPath };
      } catch (error) {
        return {
          status: 'error',
          message: actionErrorMessage(error, 'That image did not upload. Try another one.'),
        };
      }
    },
    [startUpload, width, maxBytes],
  );
}
