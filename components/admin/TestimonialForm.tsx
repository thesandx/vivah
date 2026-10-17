'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import type { ActionState } from '@/components/admin/AdminActionForm';
import { TestimonialPreview } from '@/components/admin/TestimonialPreview';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { type UploadStart, useImageUpload } from '@/hooks/useImageUpload';
import { actionErrorMessage } from '@/lib/action-errors';
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
 * Beside the fields, a live preview draws the card exactly as the home page
 * will, from the unsaved fields and the chosen photo. The photo shows from
 * the admin's own device, before any upload, so a bad crop or a review that
 * runs too long is fixed before it goes live.
 *
 * `'use client'` for the file picker, the upload and the preview's state.
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
  /** The saved image's URL. `null` for a new item. */
  image: string | null;
  /** The fields' starting values by input name, the same as their `defaultValue`. */
  initialValues: Readonly<Record<string, string>>;
  /** The fields: inputs named as the Server Action reads them. */
  children: React.ReactNode;
}

function fieldValues(form: HTMLFormElement): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of new FormData(form)) {
    if (typeof value === 'string') values[name] = value;
  }
  return values;
}

export function TestimonialForm({
  kind,
  startUpload,
  save,
  isNew,
  imageLabel,
  submitLabel,
  image,
  initialValues,
  children,
}: TestimonialFormProps): React.JSX.Element {
  const inputId = useId();
  const previewId = useId();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ActionState>({ status: 'idle' });
  const [values, setValues] = useState(initialValues);
  // The chosen photo, read from the admin's device: nothing is uploaded yet.
  const [chosenImage, setChosenImage] = useState<string | null>(null);

  useEffect(() => {
    if (chosenImage === null) return undefined;
    return () => URL.revokeObjectURL(chosenImage);
  }, [chosenImage]);

  function choose(file: File | undefined): void {
    setChosenImage(file !== undefined && file.size > 0 ? URL.createObjectURL(file) : null);
  }
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
    } catch (error) {
      setState({
        status: 'error',
        message: actionErrorMessage(error, 'That did not save. Try again.'),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <section
        aria-labelledby={previewId}
        className="flex flex-col items-center gap-3 md:sticky md:top-24 md:shrink-0"
      >
        <header className="flex flex-col items-center gap-1 text-center">
          <p id={previewId} className="font-semibold">
            Preview
          </p>
          <p className="text-small text-ink-soft max-w-64">
            As it shows on the home page. It changes as you type.
          </p>
        </header>
        <TestimonialPreview kind={kind} values={values} image={chosenImage ?? image} />
      </section>

      <form
        className="flex flex-1 flex-col gap-4"
        onChange={(event) => setValues(fieldValues(event.currentTarget))}
        onReset={() => {
          setValues(initialValues);
          setChosenImage(null);
        }}
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
            onChange={(event) => choose(event.currentTarget.files?.[0])}
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
    </div>
  );
}
