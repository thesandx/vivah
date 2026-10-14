'use client';

import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { cn } from '@/lib/utils';

/**
 * The address step on the preview page: the couple picks where their invite
 * lives (`radha-shyam.vivah.online`), then publishes it.
 *
 * A Client Component because it holds the choice, checks a typed address as
 * the couple types, and handles the button. The checks and the publish run on
 * the server, through the two functions the page passes in (Server Actions),
 * so this file imports nothing from `services/`.
 *
 * The availability shown here is a courtesy. The publish step checks again,
 * inside a transaction, and answers "taken" if somebody got there first.
 */

/** The radio value for "type my own address". Never a valid slug (uppercase). */
const CUSTOM = 'CUSTOM';

/** Wait this long after the last keystroke before checking a typed address. */
const CHECK_DELAY_MS = 400;

export type SlugCheck =
  | { available: true }
  | { available: false; reason: 'invalid'; message: string }
  | { available: false; reason: 'taken' };

export type PublishOutcome =
  { ok: true; url: string } | { ok: false; message: string; taken?: boolean };

export interface SlugPickerProps {
  leadId: string;
  /**
   * Free addresses, best first. Only free ones: the couple never sees "taken"
   * for an address we suggested. "Taken" appears only for one they type.
   */
  suggestions: readonly string[];
  /** The part after the slug, as the couple reads it: `vivah.online`. */
  domainLabel: string;
  checkSlug: (slug: string) => Promise<SlugCheck>;
  publish: (leadId: string, slug: string) => Promise<PublishOutcome>;
  className?: string;
}

type CustomState =
  | { kind: 'empty' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'problem'; message: string };

/**
 * What a typed address becomes as it is typed: lowercase, spaces to hyphens,
 * and every other character an address cannot hold dropped. A dot is dropped
 * on purpose: `radha.shyam.vivah.online` would be a deeper host that the
 * certificate does not cover. The server refuses these too (`slugProblem`).
 */
function normaliseTyped(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function SlugPicker({
  leadId,
  suggestions,
  domainLabel,
  checkSlug,
  publish,
  className,
}: SlugPickerProps): React.JSX.Element {
  const [offered, setOffered] = useState<readonly string[]>(suggestions);
  const [choice, setChoice] = useState<string>(() => suggestions[0] ?? CUSTOM);
  const [typed, setTyped] = useState('');
  const [custom, setCustom] = useState<CustomState>({ kind: 'empty' });
  const [status, setStatus] = useState<'idle' | 'working' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Check the typed address once the couple pauses. The cleanup cancels a
  // check whose answer would arrive for an address they have since changed.
  useEffect(() => {
    if (choice !== CUSTOM || typed === '') return;
    let current = true;
    const timer = setTimeout(() => {
      checkSlug(typed)
        .then((result) => {
          if (!current) return;
          if (result.available) setCustom({ kind: 'available' });
          else if (result.reason === 'taken') {
            setCustom({ kind: 'problem', message: 'This address is taken. Try another.' });
          } else setCustom({ kind: 'problem', message: result.message });
        })
        .catch(() => {
          if (current) {
            setCustom({ kind: 'problem', message: 'We could not check this address. Try again.' });
          }
        });
    }, CHECK_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [choice, typed, checkSlug]);

  const slug = choice === CUSTOM ? typed : choice;
  const ready =
    status === 'idle' && slug !== '' && (choice !== CUSTOM || custom.kind === 'available');

  async function handlePublish(): Promise<void> {
    setStatus('working');
    setError(null);
    try {
      const result = await publish(leadId, slug);
      if (result.ok) {
        setStatus('done');
        window.location.assign(result.url);
        return;
      }
      if (result.taken === true) {
        if (choice === CUSTOM) {
          setCustom({ kind: 'problem', message: 'This address is taken. Try another.' });
          setError(result.message);
        } else {
          // Another couple published our suggestion a moment ago. Drop it
          // quietly and move to the next one, rather than say "taken".
          const remaining = offered.filter((item) => item !== choice);
          setOffered(remaining);
          setChoice(remaining[0] ?? CUSTOM);
          setError('That address was just published by another couple. Choose again.');
        }
      } else {
        setError(result.message);
      }
    } catch {
      setError('Your invite was not published. Check your connection and try again.');
    }
    setStatus('idle');
  }

  const options = [
    ...offered.map((slug) => ({ value: slug, label: `${slug}.${domainLabel}` })),
    { value: CUSTOM, label: 'Choose my own address' },
  ];

  const customHint =
    custom.kind === 'checking'
      ? 'Checking…'
      : custom.kind === 'available'
        ? `${typed}.${domainLabel} is free.`
        : typed === ''
          ? 'Make it yours. For example, virat-anushka could be virushka, and deepika-ranveer could be deepveer.'
          : `Your invite will be at ${typed}.${domainLabel}`;

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <RadioGroup
        label="Choose your invite address"
        name="slug"
        options={options}
        value={choice}
        onChange={(value) => {
          setChoice(value);
          setError(null);
        }}
      />

      {choice === CUSTOM && (
        <Input
          label="Your address"
          name="customSlug"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          placeholder="virushka"
          value={typed}
          onChange={(event) => {
            const next = normaliseTyped(event.target.value);
            setTyped(next);
            setCustom(next === '' ? { kind: 'empty' } : { kind: 'checking' });
          }}
          hint={customHint}
          {...(custom.kind === 'problem' && { error: custom.message })}
        />
      )}

      <Alert tone="info" title="Test payment">
        Payment is not connected yet. This button publishes your invite without charging you.
      </Alert>

      {status === 'done' && <Alert tone="success" title="Your invite is live. Opening it now." />}
      {error !== null && (
        <Alert tone="danger" title="Your invite was not published.">
          {error}
        </Alert>
      )}

      <Button
        type="button"
        variant="primary"
        block
        disabled={!ready}
        onClick={() => {
          void handlePublish();
        }}
      >
        {status === 'working' ? 'Publishing your invite' : 'Pay and publish'}
      </Button>
    </div>
  );
}
