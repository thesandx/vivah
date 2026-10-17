'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';

import type { ActionState } from '@/components/admin/AdminActionForm';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { type UploadStart, useImageUpload } from '@/hooks/useImageUpload';
import { actionErrorMessage } from '@/lib/action-errors';
import { MAX_STEP_IMAGE_BYTES, STEP_IMAGE_WIDTH } from '@/lib/how-it-works';

/**
 * Uploads a new phone screen for one "How it works" step on the home page.
 * `useImageUpload` shrinks it to `STEP_IMAGE_WIDTH` and sends it to the
 * bucket; the server then checks it and puts it live.
 *
 * `'use client'` for the file picker and the upload.
 */

export type StepUploadStart = UploadStart;

export interface StepImageUploadProps {
  /** Server Action, bound to the step: a signed URL for an image of this type. */
  startUpload: (contentType: string) => Promise<StepUploadStart>;
  /** Server Action, bound to the step: checks the upload and makes it live. */
  saveUpload: (tmpPath: string) => Promise<ActionState>;
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

  const uploadImage = useImageUpload({
    startUpload,
    width: STEP_IMAGE_WIDTH,
    maxBytes: MAX_STEP_IMAGE_BYTES,
  });

  async function upload(file: File): Promise<void> {
    setPending(true);
    setState({ status: 'idle' });
    try {
      const uploaded = await uploadImage(file);
      if (uploaded.status === 'error') {
        setState(uploaded);
        return;
      }
      const saved = await saveUpload(uploaded.tmpPath);
      setState(saved);
      if (saved.status === 'ok') router.refresh();
    } catch (error) {
      setState({
        status: 'error',
        message: actionErrorMessage(error, 'That image did not upload. Try another one.'),
      });
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
