'use client';

import { useEffect } from 'react';

import { Input } from '@/components/ui/Input';
import { RadioGroup } from '@/components/ui/RadioGroup';

/**
 * Where a couple's invite lives: `radha-shyam.vivah.online`. The couple picks
 * a ready-made address or types their own, and a typed one is checked as they
 * type.
 *
 * Controlled: the parent holds the value, so it survives a step change on the
 * sign-up card. The parent passes its `useState` setter, so a check that
 * answers late updates the value it was asked about and nothing newer.
 *
 * The availability shown here is a courtesy. Creating the lead checks again,
 * and publishing checks again inside a transaction.
 */

/** The radio value for "type my own address". Never a valid slug (uppercase). */
export const CUSTOM = 'CUSTOM';

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
}

export function AddressChoice({
  suggestions,
  domainLabel,
  checkSlug,
  value,
  onChange,
  label = 'Choose your invite address',
}: AddressChoiceProps): React.JSX.Element {
  const { choice, typed, check } = value;

  // Check the typed address once the couple pauses. The cleanup cancels a
  // check whose answer would arrive for an address they have since changed,
  // and the update applies only while the typed address is still the same.
  useEffect(() => {
    if (choice !== CUSTOM || typed === '') return;
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
  }, [choice, typed, checkSlug, onChange]);

  const options = [
    ...suggestions.map((slug) => ({ value: slug, label: `${slug}.${domainLabel}` })),
    { value: CUSTOM, label: 'Choose my own address' },
  ];

  const hint =
    check.kind === 'checking'
      ? 'Checking…'
      : check.kind === 'available'
        ? `${typed}.${domainLabel} is free.`
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
            onChange((previous) => ({
              ...previous,
              typed: next,
              check: next === '' ? { kind: 'empty' } : { kind: 'checking' },
            }));
          }}
          hint={hint}
          {...(check.kind === 'problem' && { error: check.message })}
        />
      )}
    </div>
  );
}
