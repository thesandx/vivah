'use client';

import { useState, useTransition } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PlayButton } from '@/components/ui/PlayButton';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { parseSongSlot, type SongOption, type SongSlot } from '@/lib/wedding-songs';

/**
 * The couple's song in the dashboard: the same list as step 4 of the sign-up
 * card, with a play button on each row. Playing a song chooses it. "Save song"
 * sends only the slot; the server copies the song from the admin's list.
 *
 * `'use client'` for the choice, the players and the pending state.
 */

export type SongSaveResult = { ok: boolean; message: string };

export interface SongPickerProps {
  songs: readonly SongOption[];
  /** The slot holding the couple's song now, or `null` when it is not on the list. */
  currentSlot: SongSlot | null;
  /** The song's name now, or `null` when the site has none. */
  currentName: string | null;
  /** The Server Action, already bound to this wedding's slug. */
  save: (slot: SongSlot) => Promise<SongSaveResult>;
}

export function SongPicker({
  songs,
  currentSlot,
  currentName,
  save,
}: SongPickerProps): React.JSX.Element {
  const [slot, setSlot] = useState<SongSlot | null>(currentSlot);
  const [result, setResult] = useState<SongSaveResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (songs.length === 0) {
    return (
      <p className="text-small text-ink-soft">
        {currentName === null
          ? 'No songs to choose from right now. Check back soon.'
          : `Your song is ${currentName}. No other songs to choose from right now.`}
      </p>
    );
  }

  function choose(next: SongSlot | null): void {
    setSlot(next);
    setResult(null);
  }

  function handleSave(): void {
    if (slot === null) return;
    startTransition(async () => {
      try {
        setResult(await save(slot));
      } catch {
        setResult({ ok: false, message: 'Your song was not saved. Try again.' });
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {currentName !== null && currentSlot === null && (
        <p className="text-small text-ink-soft">
          Your song now is {currentName}. Choose one below to change it.
        </p>
      )}
      <RadioGroup
        label="Choose your song"
        name="songSlot"
        value={slot === null ? '' : String(slot)}
        onChange={(value) => choose(parseSongSlot(value))}
        options={songs.map((option) => ({
          value: String(option.slot),
          label: option.name,
          action: (
            <PlayButton src={option.src} title={option.name} onPlay={() => choose(option.slot)} />
          ),
        }))}
      />
      <Button
        type="button"
        variant="primary"
        onClick={handleSave}
        disabled={slot === null || slot === currentSlot || pending}
        className="sm:self-start"
      >
        {pending ? 'Saving…' : 'Save song'}
      </Button>
      {result !== null && <Alert tone={result.ok ? 'success' : 'danger'} title={result.message} />}
    </div>
  );
}
