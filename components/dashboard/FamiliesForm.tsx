'use client';

import { useActionState, useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { NameOrder } from '@/lib/couple-names';
import { cn } from '@/lib/utils';
import {
  EMPTY_FAMILY,
  type Family,
  FAMILY_FIELD_LABELS,
  FAMILY_FIELDS,
  FAMILY_NAME_MAX,
  FAMILY_SIDE_LABELS,
  familyFieldName,
  familyHasNames,
  type FamilySide,
  familyTitle,
  familyTitleSuggestions,
  orderedSides,
  type WeddingFamilies,
} from '@/lib/wedding-families';

/**
 * The grandparents' and parents' names on both sides, for the invite's
 * "Our Families" section. Read-only first; "Edit family names" turns it into
 * a form. Every field is optional, and an empty field clears that name.
 *
 * Used by the couple dashboard and by `/admin`. A Client Component for the
 * edit switch and the field errors. The save runs on the server, through the
 * Server Action the page passes in, which checks the caller.
 */

export type FamiliesSaveState =
  | { status: 'idle' }
  | { status: 'saved' }
  | { status: 'error'; message: string; errors?: Record<string, string> };

export interface FamiliesFormProps {
  /** The saved names, or `undefined` when none were added. */
  initial: WeddingFamilies | undefined;
  /** The couple's names, for the `Priya's Family` heading and suggestion. */
  bride: string;
  groom: string;
  /** The sides follow the couple's name order, as on the invite. */
  nameOrder?: NameOrder | undefined;
  /** The Server Action, already bound to this wedding. */
  save: (state: FamiliesSaveState, form: FormData) => Promise<FamiliesSaveState>;
  /** Where the live invite is, to check it after saving. */
  inviteHref: string;
  className?: string;
}

/** What each field shows as an example: a Delhi family. */
const PLACEHOLDERS: Record<FamilySide, Record<(typeof FAMILY_FIELDS)[number], string>> = {
  groom: {
    title: 'Kapoor Parivar',
    grandmother: 'Smt. Santosh Kapoor',
    grandfather: 'Shri Om Prakash Kapoor',
    mother: 'Smt. Anita Kapoor',
    father: 'Shri Sunil Kapoor',
  },
  bride: {
    title: 'Malhotra Parivar',
    grandmother: 'Smt. Kamla Malhotra',
    grandfather: 'Shri Harish Chandra Malhotra',
    mother: 'Smt. Neelam Malhotra',
    father: 'Shri Rajiv Malhotra',
  },
};

function pair(first: string | null, second: string | null): string | null {
  const names = [first, second].filter((name) => name !== null);
  return names.length === 0 ? null : names.join(' & ');
}

const NO_TITLE = 'No title';

/**
 * The heading field, with one-tap suggestions under it ("Malhotra Parivar",
 * "Priya's Family", "Vadhu Paksh"...) and "No title" for a card with no
 * heading. A tap fills the field; the couple can still type their own. Left
 * empty, the card builds its heading from the names, and the hint says which.
 * `family` holds the names as typed now, so the suggestions follow them.
 */
function TitleField({
  side,
  family,
  firstName,
  error,
}: {
  side: FamilySide;
  family: Family;
  firstName: string;
  error: string | undefined;
}) {
  const [off, setOff] = useState(family.noTitle === true);
  const [value, setValue] = useState(() => (family.noTitle === true ? '' : (family.title ?? '')));
  const suggestions = familyTitleSuggestions(side, family, firstName);
  const automatic = familyTitle({ ...family, title: null, noTitle: false }, firstName);
  const hint = off
    ? 'The card shows no title. Tap a suggestion to add one.'
    : value === '' && automatic !== null
      ? `Left empty, the card shows “${automatic}”. Or tap a suggestion.`
      : 'The heading on the card, as you write it. Or tap a suggestion.';
  return (
    <div className="flex flex-col gap-3">
      <Input
        label={FAMILY_FIELD_LABELS.title}
        name={familyFieldName(side, 'title')}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={off}
        maxLength={FAMILY_NAME_MAX}
        autoComplete="off"
        placeholder={automatic ?? PLACEHOLDERS[side].title}
        hint={hint}
        {...(error !== undefined && { error })}
      />
      {off && <input type="hidden" name={familyFieldName(side, 'noTitle')} value="1" />}
      <div
        role="group"
        aria-label={`Suggested titles for the ${FAMILY_SIDE_LABELS[side].family.toLowerCase()}`}
        className="flex flex-wrap gap-2"
      >
        {[...suggestions, NO_TITLE].map((suggestion) => {
          const pressed = suggestion === NO_TITLE ? off : !off && value === suggestion;
          return (
            <button
              key={suggestion}
              type="button"
              aria-pressed={pressed}
              onClick={() => {
                const none = suggestion === NO_TITLE;
                setOff(none);
                setValue(none ? '' : suggestion);
              }}
              className={cn(
                'rounded-pill text-small min-h-11 border-2 px-4 font-medium',
                pressed
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line bg-surface text-ink',
              )}
            >
              {suggestion}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const NAME_FIELDS = FAMILY_FIELDS.filter((field) => field !== 'title');

/**
 * One side's box: the four names, then the title. It tracks the names as they
 * are typed, so the title suggestions use the surname just entered.
 */
function FamilyFieldset({
  side,
  family,
  firstName,
  errors,
}: {
  side: FamilySide;
  family: Family;
  firstName: string;
  errors: Record<string, string>;
}) {
  const [names, setNames] = useState(family);
  return (
    <fieldset className="border-line rounded-input flex flex-col gap-4 border-2 p-4">
      <legend className="text-small px-1 font-medium">{FAMILY_SIDE_LABELS[side].family}</legend>
      <div className="grid gap-4">
        {NAME_FIELDS.map((field) => {
          const name = familyFieldName(side, field);
          const message = errors[name];
          return (
            <div key={field}>
              <Input
                label={FAMILY_FIELD_LABELS[field]}
                name={name}
                defaultValue={family[field] ?? ''}
                onChange={(event) => {
                  const typed = event.target.value.trim();
                  setNames((current) => ({ ...current, [field]: typed === '' ? null : typed }));
                }}
                maxLength={FAMILY_NAME_MAX}
                autoComplete="off"
                placeholder={PLACEHOLDERS[side][field]}
                {...(message !== undefined && { error: message })}
              />
            </div>
          );
        })}
        <TitleField
          side={side}
          family={names}
          firstName={firstName}
          error={errors[familyFieldName(side, 'title')]}
        />
      </div>
    </fieldset>
  );
}

function FamilySummary({
  side,
  family,
  firstName,
}: {
  side: FamilySide;
  family: Family;
  firstName: string;
}) {
  const title = family.noTitle === true ? 'No title' : familyTitle(family, firstName);
  const grandparents = pair(family.grandmother, family.grandfather);
  const parents = pair(family.mother, family.father);
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-medium">
        {FAMILY_SIDE_LABELS[side].family}
        {title !== null && <span className="text-ink-soft font-normal"> · {title}</span>}
      </dt>
      {grandparents === null && parents === null ? (
        <dd className="text-small text-ink-soft">No names added yet</dd>
      ) : (
        <>
          {grandparents !== null && (
            <dd className="text-small text-ink-soft break-words">Grandparents: {grandparents}</dd>
          )}
          {parents !== null && (
            <dd className="text-small text-ink-soft break-words">
              {FAMILY_SIDE_LABELS[side].childOf}: {parents}
            </dd>
          )}
        </>
      )}
    </div>
  );
}

export function FamiliesForm({
  initial,
  bride,
  groom,
  nameOrder,
  save,
  inviteHref,
  className,
}: FamiliesFormProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: FamiliesSaveState, form: FormData): Promise<FamiliesSaveState> => {
      const result = await save(previous, form);
      if (result.status === 'saved') setEditing(false);
      return result;
    },
    { status: 'idle' },
  );
  const sides = orderedSides(nameOrder);
  const firstNameOf = (side: FamilySide) => (side === 'bride' ? bride : groom);
  const any = sides.some((side) => familyHasNames(initial?.[side]));

  if (!editing) {
    return (
      <div className={cn('flex flex-col gap-5', className)}>
        {any ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            {sides.map((side) => (
              <FamilySummary
                key={side}
                side={side}
                family={initial?.[side] ?? EMPTY_FAMILY}
                firstName={firstNameOf(side)}
              />
            ))}
          </dl>
        ) : (
          <p className="text-ink-soft">
            No family names yet. Add your parents&rsquo; and grandparents&rsquo; names, and your
            invite shows them in an &ldquo;Our Families&rdquo; section.
          </p>
        )}

        {state.status === 'saved' && (
          <Alert tone="success" title="Saved. Your guests see your families now.">
            <a
              href={inviteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              Open your invite
            </a>
          </Alert>
        )}

        <Button variant="secondary" block onClick={() => setEditing(true)}>
          {any ? 'Edit family names' : 'Add family names'}
        </Button>
      </div>
    );
  }

  const errors = state.status === 'error' ? (state.errors ?? {}) : {};

  return (
    <form action={action} className={cn('flex flex-col gap-5', className)} noValidate>
      <p className="text-small text-ink-soft">
        Write each name as guests should read it, with Smt. or Shri. Leave a field empty to leave it
        out. Grandparents are optional.
      </p>
      {sides.map((side) => (
        <FamilyFieldset
          key={side}
          side={side}
          family={initial?.[side] ?? EMPTY_FAMILY}
          firstName={firstNameOf(side)}
          errors={errors}
        />
      ))}

      {state.status === 'error' && <Alert tone="danger" title={state.message} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" block disabled={pending} onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" block disabled={pending}>
          {pending ? 'Saving' : 'Save family names'}
        </Button>
      </div>
    </form>
  );
}
