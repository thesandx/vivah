'use client';

import { useActionState, useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { formatWeddingTime } from '@/lib/wedding-date';
import {
  FESTIVITY_LABELS,
  formatFestivityDate,
  FUNCTION_KINDS,
  functionFieldName,
  type FunctionKind,
  type WeddingFunction,
} from '@/lib/wedding-functions';

/**
 * The functions besides the wedding (tilak, haldi, mehndi, sangeet,
 * reception), each with its date, time, venue and map link. Read-only
 * first; "Edit functions" turns it into a form where a tick adds or removes
 * a function. The invite sorts the cards by date, so a new date moves a
 * card on the next load.
 *
 * Used by the couple dashboard and by `/admin`. A Client Component for the
 * edit switch, the ticks and the field errors. The save runs on the server,
 * through the Server Action the page passes in, which checks the caller.
 */

export type FunctionsSaveState =
  | { status: 'idle' }
  | { status: 'saved' }
  | { status: 'error'; message: string; errors?: Record<string, string> };

export interface FunctionsFormProps {
  /** The saved functions, in any order. */
  initial: readonly WeddingFunction[];
  /** The Server Action, already bound to this wedding. */
  save: (state: FunctionsSaveState, form: FormData) => Promise<FunctionsSaveState>;
  /** Where the live invite is, to check it after saving. */
  inviteHref: string;
  className?: string;
}

function summary(entry: WeddingFunction): string {
  const parts = [
    entry.date === null ? null : formatFestivityDate(entry.date),
    entry.time === null ? null : formatWeddingTime(entry.time),
    entry.venue,
  ].filter((part) => part !== null);
  return parts.length === 0 ? 'Details not added yet' : parts.join(' · ');
}

export function FunctionsForm({
  initial,
  save,
  inviteHref,
  className,
}: FunctionsFormProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);
  const saved = new Map(initial.map((entry) => [entry.kind, entry]));
  const [ticked, setTicked] = useState<ReadonlySet<FunctionKind>>(
    () => new Set(initial.map((entry) => entry.kind)),
  );
  const [state, action, pending] = useActionState(
    async (previous: FunctionsSaveState, form: FormData): Promise<FunctionsSaveState> => {
      const result = await save(previous, form);
      if (result.status === 'saved') setEditing(false);
      return result;
    },
    { status: 'idle' },
  );

  if (!editing) {
    const listed = FUNCTION_KINDS.flatMap((kind) => saved.get(kind) ?? []);
    return (
      <div className={cn('flex flex-col gap-5', className)}>
        {listed.length === 0 ? (
          <p className="text-ink-soft">
            No functions yet. Add tilak, haldi, mehndi, sangeet or reception, and your invite shows
            them all on a timeline with the wedding.
          </p>
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            {listed.map((entry) => (
              <div key={entry.kind} className="flex flex-col gap-1">
                <dt className="font-medium">{FESTIVITY_LABELS[entry.kind].name}</dt>
                <dd className="text-small text-ink-soft break-words">{summary(entry)}</dd>
              </div>
            ))}
          </dl>
        )}

        {state.status === 'saved' && (
          <Alert tone="success" title="Saved. Your guests see the new functions now.">
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

        <Button
          variant="secondary"
          block
          onClick={() => {
            setTicked(new Set(initial.map((entry) => entry.kind)));
            setEditing(true);
          }}
        >
          {listed.length === 0 ? 'Add functions' : 'Edit functions'}
        </Button>
      </div>
    );
  }

  const errors = state.status === 'error' ? (state.errors ?? {}) : {};
  const error = (kind: FunctionKind, field: 'date' | 'time' | 'venue' | 'mapsUrl') => {
    const message = errors[functionFieldName(kind, field)];
    return message === undefined ? {} : { error: message };
  };

  return (
    <form action={action} className={cn('flex flex-col gap-5', className)} noValidate>
      <p className="text-small text-ink-soft">
        Tick the functions you are having. The invite shows them with the wedding, in date order.
      </p>
      {FUNCTION_KINDS.map((kind) => {
        const entry = saved.get(kind);
        const on = ticked.has(kind);
        const name = FESTIVITY_LABELS[kind].name;
        return (
          <fieldset
            key={kind}
            className="border-line rounded-input flex flex-col gap-4 border-2 p-4"
          >
            <legend className="sr-only">{name}</legend>
            <Checkbox
              label={name}
              name={functionFieldName(kind, 'on')}
              value="1"
              checked={on}
              onChange={(event) => {
                const next = new Set(ticked);
                if (event.target.checked) next.add(kind);
                else next.delete(kind);
                setTicked(next);
              }}
            />
            {on && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Date"
                  name={functionFieldName(kind, 'date')}
                  type="date"
                  defaultValue={entry?.date ?? ''}
                  {...error(kind, 'date')}
                />
                <Input
                  label="Time"
                  name={functionFieldName(kind, 'time')}
                  type="time"
                  defaultValue={entry?.time ?? ''}
                  hint="India time."
                  {...error(kind, 'time')}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Venue"
                    name={functionFieldName(kind, 'venue')}
                    defaultValue={entry?.venue ?? ''}
                    maxLength={100}
                    placeholder="The Grand Pavilion Lawns, Chhatarpur"
                    {...error(kind, 'venue')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Input
                    label="Google Maps link"
                    name={functionFieldName(kind, 'mapsUrl')}
                    type="url"
                    inputMode="url"
                    defaultValue={entry?.mapsUrl ?? ''}
                    hint="In Google Maps, open the venue, tap Share and paste the link here."
                    {...error(kind, 'mapsUrl')}
                  />
                </div>
              </div>
            )}
          </fieldset>
        );
      })}

      {state.status === 'error' && <Alert tone="danger" title={state.message} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" block disabled={pending} onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" block disabled={pending}>
          {pending ? 'Saving' : 'Save functions'}
        </Button>
      </div>
    </form>
  );
}
