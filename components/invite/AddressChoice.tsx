'use client';

import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/Input';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { looksLikeHomeAddress } from '@/lib/couple-slug';

/**
 * Where a couple's invite lives: `radha-shyam.vivah.online`. The couple picks
 * a ready-made address or types their own, and a typed one is checked as they
 * type.
 *
 * Controlled: the parent holds the value, so it survives a step change on the
 * sign-up card. The parent passes its `useState` setter, so a check that
 * answers late updates the value it was asked about and nothing newer.
 *
 * Some couples read "address" as where they live, and type a home address.
 * So the sign-up card shows the choice as a browser's address bar
 * (`preview`), and a typed text that looks like a postal address is refused
 * with a plain message, before any availability check.
 *
 * The availability shown here is a courtesy. Creating the lead checks again,
 * and publishing checks again inside a transaction.
 */

/** The radio value for "type my own address". Never a valid slug (uppercase). */
export const CUSTOM = 'CUSTOM';

/** Shown when the typed text looks like where the couple lives. */
export const HOME_ADDRESS_MESSAGE =
  'This looks like a home address. Type a short name for your website, like priya-rahul. Your venue comes later.';

/** Wait this long after the last keystroke before checking a typed address. */
const CHECK_DELAY_MS = 400;

export type SlugCheck =
  | { available: true }
  | { available: false; reason: 'invalid'; message: string }
  | { available: false; reason: 'taken' };

/** The state of a typed address. Ready-made ones are always free. */
export type TypedCheck =
  | { kind: 'empty' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'problem'; message: string };

export interface AddressValue {
  /** A suggested slug, or `CUSTOM`. */
  choice: string;
  /** The typed address, used when `choice` is `CUSTOM`. */
  typed: string;
  check: TypedCheck;
}

/**
 * The starting value: `preferred` when the couple chose it before, else the
 * first suggestion, else an empty typed address.
 */
export function initialAddress(suggestions: readonly string[], preferred = ''): AddressValue {
  if (preferred !== '' && suggestions.includes(preferred)) {
    return { choice: preferred, typed: '', check: { kind: 'empty' } };
  }
  if (preferred !== '') return { choice: CUSTOM, typed: preferred, check: { kind: 'checking' } };
  return { choice: suggestions[0] ?? CUSTOM, typed: '', check: { kind: 'empty' } };
}

/** The address to use, or `null` while a typed one is empty, unchecked or refused. */
export function chosenSlug(value: AddressValue): string | null {
  if (value.choice !== CUSTOM) return value.choice;
  return value.check.kind === 'available' ? value.typed : null;
}

/**
 * What a typed address becomes as it is typed: lowercase, spaces to hyphens,
 * and every other character an address cannot hold dropped. A dot is dropped
 * on purpose: `radha.shyam.vivah.online` would be a deeper host that the
 * certificate does not cover. The server refuses these too (`slugProblem`).
 */
export function normaliseTyped(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/** A green tick in the address field, once a typed address is available. */
function AvailableTick() {
  return (
    <span className="bg-success text-on-brand rounded-pill animate-pop inline-grid size-7 place-items-center">
      <svg viewBox="0 0 24 24" className="size-4" fill="none">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export interface AddressChoiceProps {
  /**
   * Free addresses, best first. Only free ones: the couple never sees "taken"
   * for an address we suggested. "Taken" appears only for one they type.
   */
  suggestions: readonly string[];
  /** The part after the slug, as the couple reads it: `vivah.online`. */
  domainLabel: string;
  checkSlug: (slug: string) => Promise<SlugCheck>;
  value: AddressValue;
  /** Must be stable (a `useState` setter, or wrapped in `useCallback`): the check runs from an effect. */
  onChange: React.Dispatch<React.SetStateAction<AddressValue>>;
  /** The group's label. Default: "Choose your invite address". */
  label?: string;
  /** The words of the "type my own" option. Default: "Choose my own address". */
  customLabel?: string;
  /**
   * Show the chosen link as a browser's address bar, under the choice, with
   * this line under it. Default: no bar.
   */
  preview?: string;
}

/** A padlock, as a browser shows before a secure address. */
function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0" fill="none">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

export interface LinkBarProps {
  /** The slug, or `''` while none is typed. */
  slug: string;
  domainLabel: string;
  /** The line under the bar. */
  caption: string;
}

/**
 * The chosen link, drawn as a browser's address bar, so it reads as a
 * website and never as a home address.
 */
export function LinkBar({ slug, domainLabel, caption }: LinkBarProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="bg-sunken rounded-pill text-small flex min-w-0 items-center gap-2 px-4 py-2.5">
        <span className="text-ink-soft">
          <LockGlyph />
        </span>
        <span className="sr-only">Your website link: </span>
        <span className="min-w-0 truncate">
          <span className="text-ink-soft">https://</span>
          {slug === '' ? (
            <span className="text-ink-soft">your-names</span>
          ) : (
            <span className="text-ink font-semibold">{slug}</span>
          )}
          <span className="text-ink-soft">.{domainLabel}</span>
        </span>
      </p>
      <p className="text-small text-ink-soft text-center">{caption}</p>
    </div>
  );
}

export function AddressChoice({
  suggestions,
  domainLabel,
  checkSlug,
  value,
  onChange,
  label = 'Choose your invite address',
  customLabel = 'Choose my own address',
  preview,
}: AddressChoiceProps): React.JSX.Element {
  const { choice, typed, check } = value;
  /** The raw text last typed looked like a home address. */
  const [homeLike, setHomeLike] = useState(false);

  // Check the typed address once the couple pauses. The cleanup cancels a
  // check whose answer would arrive for an address they have since changed,
  // and the update applies only while the typed address is still the same.
  useEffect(() => {
    if (choice !== CUSTOM || typed === '' || homeLike) return;
    let current = true;
    const answer = (next: TypedCheck): void => {
      if (!current) return;
      onChange((previous) => (previous.typed === typed ? { ...previous, check: next } : previous));
    };
    const timer = setTimeout(() => {
      checkSlug(typed)
        .then((result) => {
          if (result.available) answer({ kind: 'available' });
          else if (result.reason === 'taken') {
            answer({ kind: 'problem', message: 'This address is taken. Try another.' });
          } else answer({ kind: 'problem', message: result.message });
        })
        .catch(() => {
          answer({ kind: 'problem', message: 'We could not check this address. Try again.' });
        });
    }, CHECK_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [choice, typed, homeLike, checkSlug, onChange]);

  const options = [
    ...suggestions.map((slug) => ({ value: slug, label: `${slug}.${domainLabel}` })),
    { value: CUSTOM, label: customLabel },
  ];

  const hint =
    check.kind === 'checking'
      ? 'Checking…'
      : check.kind === 'available'
        ? preview === undefined
          ? `${typed}.${domainLabel} is available.`
          : 'Available.'
        : typed === ''
          ? 'Make it yours. For example, virat-anushka could be virushka, and deepika-ranveer could be deepveer.'
          : `Your invite will be at ${typed}.${domainLabel}`;

  return (
    <div className="flex flex-col gap-4">
      <RadioGroup
        label={label}
        name="slug"
        options={options}
        value={choice}
        onChange={(next) => onChange((previous) => ({ ...previous, choice: next }))}
      />

      {choice === CUSTOM && (
        <Input
          label="Your link"
          name="customSlug"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          placeholder="virushka"
          value={typed}
          onChange={(event) => {
            const home = looksLikeHomeAddress(event.target.value);
            setHomeLike(home);
            const next = normaliseTyped(event.target.value);
            onChange((previous) => ({
              ...previous,
              typed: next,
              check:
                next === ''
                  ? { kind: 'empty' }
                  : home
                    ? { kind: 'problem', message: HOME_ADDRESS_MESSAGE }
                    : { kind: 'checking' },
            }));
          }}
          hint={hint}
          {...(check.kind === 'available' && { suffix: <AvailableTick /> })}
          {...(check.kind === 'problem' && { error: check.message })}
        />
      )}

      {preview !== undefined && (
        <LinkBar
          slug={choice === CUSTOM ? typed : choice}
          domainLabel={domainLabel}
          caption={preview}
        />
      )}
    </div>
  );
}
