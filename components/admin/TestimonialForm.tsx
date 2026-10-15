'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import type { ActionState } from '@/components/admin/AdminActionForm';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { type UploadStart, useImageUpload } from '@/hooks/useImageUpload';
import {
  MAX_TESTIMONIAL_IMAGE_BYTES,
  TESTIMONIAL_IMAGE_WIDTH,
  type TestimonialKind,
} from '@/lib/testimonials';

/**
 * Adds or edits one chat screenshot or couple review on the home page, from
 * the Home page tab of `/admin`: an image, and the fields the page passes in
 * as `children`.
 *
 * On save, the image (if one was chosen) goes straight to the bucket first,
 * then the words and the upload's path go to the Server Action, which checks
 * the admin session, the fields and the upload. A new item needs an image;
 * an edit keeps its image unless a new one is chosen.
 *
 * `'use client'` for the file picker and the upload. The picker shows the
 * chosen file's name; the image itself shows on the list once it is saved.
 */

export interface TestimonialFormProps {
  kind: TestimonialKind;
  /** Server Action, bound to the kind: a signed URL for an image of this type. */
  startUpload: (contentType: string) => Promise<UploadStart>;
  /** Server Action, bound to the kind and item: saves the words and the upload. */
  save: (tmpPath: string | null, form: FormData) => Promise<ActionState>;
  /** `true` for the empty form that adds an item. */
  isNew: boolean;
  /** The label of the image picker, such as `Screenshot`. */
  imageLabel: string;
  submitLabel: string;
  /** The fields: inputs named as the Server Action reads them. */
  children: React.ReactNode;
}

export function TestimonialForm({
  kind,
  startUpload,
  save,
  isNew,
  imageLabel,
  submitLabel,
  children,
}: TestimonialFormProps): React.JSX.Element {
  const inputId = useId();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ActionState>({ status: 'idle' });
  const uploadImage = useImageUpload({
    startUpload,
    width: TESTIMONIAL_IMAGE_WIDTH[kind],
    maxBytes: MAX_TESTIMONIAL_IMAGE_BYTES,
  });

  async function submit(form: HTMLFormElement): Promise<void> {
    const data = new FormData(form);
    // The image goes to the bucket, never through the Server Action.
    data.delete('image');
    const picker = form.elements.namedItem('image');
    const file = picker instanceof HTMLInputElement ? picker.files?.[0] : undefined;
    const chosen = file !== undefined && file.size > 0 ? file : null;
    if (isNew && chosen === null) {
      setState({ status: 'error', message: `Choose the ${imageLabel.toLowerCase()} first.` });
      return;
    }

    setPending(true);
    setState({ status: 'idle' });
    try {
      let tmpPath: string | null = null;
      if (chosen !== null) {
        const uploaded = await uploadImage(chosen);
        if (uploaded.status === 'error') {
          setState(uploaded);
          return;
        }
        tmpPath = uploaded.tmpPath;
      }
      const saved = await save(tmpPath, data);
      setState(saved);
      if (saved.status === 'ok') {
        if (isNew) form.reset();
        router.refresh();
      }
    } catch {
      setState({ status: 'error', message: 'That did not save. Try again.' });
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="font-semibold">
          {isNew ? imageLabel : `New ${imageLabel.toLowerCase()} (optional)`}
        </label>
        <input
          id={inputId}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-small file:bg-surface file:rounded-input file:text-ink min-h-11 file:mr-3 file:border-2 file:border-line file:px-4 file:py-2 file:font-semibold"
        />
      </div>

      {children}

      <Button type="submit" variant="primary" disabled={pending} className="sm:self-start">
        {pending ? 'Saving…' : submitLabel}
      </Button>
      {state.status !== 'idle' && (
        <Alert tone={state.status === 'ok' ? 'success' : 'danger'} title={state.message} />
      )}
    </form>
  );
}
