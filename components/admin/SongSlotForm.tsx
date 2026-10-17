'use client';

import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';

import type { ActionState } from '@/components/admin/AdminActionForm';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PlayButton } from '@/components/ui/PlayButton';
import type { UploadStart } from '@/hooks/useImageUpload';
import { actionErrorMessage } from '@/lib/action-errors';
import { MAX_SONG_BYTES, MAX_SONG_NAME_LENGTH, SONG_AUDIO_TYPES } from '@/lib/wedding-songs';

/**
 * One of the four songs on step 4 of the sign-up card: its name and its
 * audio file. A new song needs both; an existing one can change its name
 * alone. The file goes straight to the bucket with a signed URL, then the
 * server checks it and saves the slot.
 *
 * `'use client'` for the file picker, the upload and the player.
 */

export interface SongSlotFormProps {
  slot: number;
  /** The song in this slot now, or `null` when it is empty. */
  current: { name: string; src: string } | null;
  /** Server Action, bound to the slot: a signed URL for a file of this type. */
  startUpload: (contentType: string) => Promise<UploadStart>;
  /** Server Action, bound to the slot: saves the name and the uploaded file. */
  save: (name: string, tmpPath: string | null) => Promise<ActionState>;
}

/** The upload gives up after this. A song is a few megabytes. */
const UPLOAD_TIMEOUT_MS = 2 * 60 * 1000;

/** Some browsers give an MP3 no type, or a non-standard one. */
function audioType(file: File): string {
  if (file.type === 'audio/mp3') return 'audio/mpeg';
  if (file.type !== '') return file.type;
  return file.name.toLowerCase().endsWith('.mp3') ? 'audio/mpeg' : '';
}

export function SongSlotForm({
  slot,
  current,
  startUpload,
  save,
}: SongSlotFormProps): React.JSX.Element {
  const fileId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [name, setName] = useState(current?.name ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<ActionState>({ status: 'idle' });

  async function upload(chosen: File): Promise<string | null> {
    const type = audioType(chosen);
    if (!(SONG_AUDIO_TYPES as readonly string[]).includes(type)) {
      setState({ status: 'error', message: 'Use an MP3, M4A, AAC or Ogg file.' });
      return null;
    }
    if (chosen.size > MAX_SONG_BYTES) {
      setState({
        status: 'error',
        message: 'That file is over 10 MB. Use a shorter or smaller one.',
      });
      return null;
    }
    const started = await startUpload(type);
    if (started.status === 'error') {
      setState(started);
      return null;
    }
    const response = await fetch(started.upload.url, {
      method: 'PUT',
      headers: started.upload.headers,
      body: chosen,
      signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
    });
    if (!response.ok) {
      setState({ status: 'error', message: 'The upload did not finish. Try again.' });
      return null;
    }
    return started.upload.tmpPath;
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPending(true);
    setState({ status: 'idle' });
    try {
      const tmpPath = file === null ? null : await upload(file);
      if (file !== null && tmpPath === null) return;
      const saved = await save(name, tmpPath);
      setState(saved);
      if (saved.status === 'ok') {
        setFile(null);
        if (fileInput.current !== null) fileInput.current.value = '';
        router.refresh();
      }
    } catch (error) {
      setState({
        status: 'error',
        message: actionErrorMessage(error, 'That song did not save. Try again.'),
      });
    } finally {
      setPending(false);
    }
  }

  const ready = name.trim() !== '' && (file !== null || current !== null) && !pending;

  return (
    <form
      onSubmit={(event) => {
        void handleSave(event);
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex items-center gap-3">
        <h4 className="text-heading flex-1">Song {slot}</h4>
        {current !== null && <PlayButton src={current.src} title={current.name} />}
      </div>
      <Input
        label="Song name"
        name="name"
        value={name}
        maxLength={MAX_SONG_NAME_LENGTH}
        onChange={(event) => setName(event.target.value)}
        hint="Couples see this name on the sign-up card."
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fileId} className="text-small font-medium">
          {current === null ? 'Song file' : 'Replace the file (optional)'}
        </label>
        <input
          ref={fileInput}
          id={fileId}
          type="file"
          accept={`${SONG_AUDIO_TYPES.join(',')},.mp3,.m4a`}
          className="text-small file:border-line file:rounded-pill file:bg-surface file:text-ink file:mr-3 file:min-h-11 file:border-2 file:px-4"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <p className="text-small text-ink-soft">MP3, M4A, AAC or Ogg, up to 10 MB.</p>
      </div>
      <Button type="submit" variant="primary" disabled={!ready} className="sm:self-start">
        {pending ? 'Saving…' : 'Save song'}
      </Button>
      {state.status !== 'idle' && (
        <Alert tone={state.status === 'ok' ? 'success' : 'danger'} title={state.message} />
      )}
    </form>
  );
}
