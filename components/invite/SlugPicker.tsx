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

export interface SlugSuggestion {
  slug: string;
  available: boolean;
}

export type SlugCheck =
  | { available: true }
  | { available: false; reason: 'invalid'; message: string }
  | { available: false; reason: 'taken' };

export type PublishOutcome =
  { ok: true; url: string } | { ok: false; message: string; taken?: boolean };

export interface SlugPickerProps {
  leadId: string;
  /** Bride first, then groom first, each with whether it is free now. */
  suggestions: readonly SlugSuggestion[];
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

/** Lowercase, spaces to hyphens: what a typed address becomes as it is typed. */
function normaliseTyped(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

export function SlugPicker({
  leadId,
  suggestions,
  domainLabel,
  checkSlug,
  publish,
  className,
}: SlugPickerProps): React.JSX.Element {
  const [taken, setTaken] = useState<ReadonlySet<string>>(
    () => new Set(suggestions.filter((item) => !item.available).map((item) => item.slug)),
  );
  const [choice, setChoice] = useState<string>(
    () => suggestions.find((item) => item.available)?.slug ?? CUSTOM,
  );
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
        } else {
          setTaken((previous) => new Set([...previous, choice]));
          setChoice(CUSTOM);
        }
      }
      setError(result.message);
    } catch {
      setError('Your invite was not published. Check your connection and try again.');
    }
    setStatus('idle');
  }

  const options = [
    ...suggestions.map((item) => ({
      value: item.slug,
      label: `${item.slug}.${domainLabel}`,
      ...(taken.has(item.slug) && { hint: 'Taken', disabled: true }),
    })),
    { value: CUSTOM, label: 'Choose my own address' },
  ];

  const customHint =
    custom.kind === 'checking'
      ? 'Checking…'
      : custom.kind === 'available'
        ? `${typed}.${domainLabel} is free.`
        : `Your invite will be at ${typed === '' ? 'your-address' : typed}.${domainLabel}`;

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
