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
    surname: 'Kapoor',
    grandmother: 'Smt. Santosh Kapoor',
    grandfather: 'Shri Om Prakash Kapoor',
    mother: 'Smt. Anita Kapoor',
    father: 'Shri Sunil Kapoor',
  },
  bride: {
    surname: 'Malhotra',
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

function FamilySummary({ side, family }: { side: FamilySide; family: Family }) {
  const title = familyTitle(family);
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
  const any = sides.some((side) => familyHasNames(initial?.[side]));

  if (!editing) {
    return (
      <div className={cn('flex flex-col gap-5', className)}>
        {any ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            {sides.map((side) => (
              <FamilySummary key={side} side={side} family={initial?.[side] ?? EMPTY_FAMILY} />
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
      {sides.map((side) => {
        const family = initial?.[side] ?? EMPTY_FAMILY;
        return (
          <fieldset
            key={side}
            className="border-line rounded-input flex flex-col gap-4 border-2 p-4"
          >
            <legend className="text-small px-1 font-medium">
              {FAMILY_SIDE_LABELS[side].family}
            </legend>
            <div className="grid gap-4">
              {FAMILY_FIELDS.map((field) => {
                const name = familyFieldName(side, field);
                const message = errors[name];
                return (
                  <div key={field}>
                    <Input
                      label={FAMILY_FIELD_LABELS[field]}
                      name={name}
                      defaultValue={family[field] ?? ''}
                      maxLength={FAMILY_NAME_MAX}
                      autoComplete="off"
                      placeholder={PLACEHOLDERS[side][field]}
                      {...(field === 'surname' && {
                        hint: `Shows as “${PLACEHOLDERS[side].surname} Parivar”. Empty: the last word of the father’s name.`,
                      })}
                      {...(message !== undefined && { error: message })}
                    />
                  </div>
                );
              })}
            </div>
          </fieldset>
        );
      })}

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
