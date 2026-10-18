'use client';

import { useActionState, useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { capitalizeName } from '@/lib/guest-name';
import { cn } from '@/lib/utils';
import { formatWeddingDate, formatWeddingTime } from '@/lib/wedding-date';

/**
 * The couple's invite details: names, day, time and venue. They show as
 * read-only text first. "Edit details" turns them into a form; "Save details"
 * saves and shows the text again, so nothing changes by accident.
 *
 * A Client Component for the edit switch, the pending state and the field
 * errors. The save runs on the server, through the Server Action the page
 * passes in, which checks the session and the ownership again.
 */

export type SaveState =
  | { status: 'idle' }
  | { status: 'saved' }
  | { status: 'error'; message: string; errors?: Partial<Record<DetailField, string>> };

export type DetailField =
  'bride' | 'groom' | 'weddingDate' | 'ceremonyTime' | 'venueName' | 'venueCity' | 'venueMapsUrl';

export type WeddingDetailValues = Record<DetailField, string>;

export interface WeddingDetailsFormProps {
  initial: WeddingDetailValues;
  /** The Server Action, already bound to this wedding's slug. */
  save: (state: SaveState, form: FormData) => Promise<SaveState>;
  /** Where the live invite is, to check it after saving. */
  inviteHref: string;
  /** Open as the form, not the read-only text. Default: `false`. */
  startEditing?: boolean;
  className?: string;
}

/** The read-only rows, in the order the form shows them. */
/** Shows a name as it will be saved, the moment the field loses focus: `RIYA` → `Riya`. */
function tidyName(event: React.FocusEvent<HTMLInputElement>): void {
  event.currentTarget.value = capitalizeName(event.currentTarget.value);
}

function detailRows(values: WeddingDetailValues): { label: string; value: string | null }[] {
  return [
    { label: "Bride's name", value: values.bride || null },
    { label: "Groom's name", value: values.groom || null },
    {
      label: 'Wedding date',
      value: values.weddingDate === '' ? null : formatWeddingDate(values.weddingDate),
    },
    {
      label: 'Ceremony time',
      value: values.ceremonyTime === '' ? null : formatWeddingTime(values.ceremonyTime),
    },
    { label: 'Venue name', value: values.venueName || null },
    { label: 'Town and state', value: values.venueCity || null },
  ];
}

export function WeddingDetailsForm({
  initial,
  save,
  inviteHref,
  startEditing = false,
  className,
}: WeddingDetailsFormProps): React.JSX.Element {
  const [editing, setEditing] = useState(startEditing);
  const [state, action, pending] = useActionState(
    async (previous: SaveState, form: FormData): Promise<SaveState> => {
      const result = await save(previous, form);
      if (result.status === 'saved') setEditing(false);
      return result;
    },
    { status: 'idle' },
  );

  const saved = state.status === 'saved' && (
    <Alert tone="success" title="Saved. Your guests see the new details now.">
      <a
        href={inviteHref}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline"
      >
        Open your invite
      </a>
    </Alert>
  );

  if (!editing) {
    return (
      <div className={cn('flex flex-col gap-5', className)}>
        <dl className="grid gap-5 sm:grid-cols-2">
          {detailRows(initial).map((row) => (
            <div key={row.label} className="flex flex-col gap-1">
              <dt className="text-small text-ink-soft">{row.label}</dt>
              <dd className={cn('break-words', row.value === null && 'text-ink-soft')}>
                {row.value ?? 'Not added yet'}
              </dd>
            </div>
          ))}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <dt className="text-small text-ink-soft">Google Maps link</dt>
            <dd className="break-all">
              {initial.venueMapsUrl === '' ? (
                <span className="text-ink-soft">Not added yet</span>
              ) : (
                <a
                  href={initial.venueMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand underline underline-offset-4"
                >
                  Open the venue in Google Maps
                </a>
              )}
            </dd>
          </div>
        </dl>

        {saved}

        <Button variant="secondary" block onClick={() => setEditing(true)}>
          Edit details
        </Button>
      </div>
    );
  }

  const errors = state.status === 'error' ? (state.errors ?? {}) : {};
  const error = (field: DetailField) =>
    errors[field] === undefined ? {} : { error: errors[field] };

  return (
    <form action={action} className={cn('flex flex-col gap-5', className)} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Bride's name"
          name="bride"
          defaultValue={initial.bride}
          onBlur={tidyName}
          required
          maxLength={60}
          {...error('bride')}
        />
        <Input
          label="Groom's name"
          name="groom"
          defaultValue={initial.groom}
          onBlur={tidyName}
          required
          maxLength={60}
          {...error('groom')}
        />
        <Input
          label="Wedding date"
          name="weddingDate"
          type="date"
          defaultValue={initial.weddingDate}
          {...error('weddingDate')}
        />
        <Input
          label="Ceremony time"
          name="ceremonyTime"
          type="time"
          defaultValue={initial.ceremonyTime}
          hint="India time. The countdown runs to this moment."
          {...error('ceremonyTime')}
        />
        <Input
          label="Venue name"
          name="venueName"
          defaultValue={initial.venueName}
          maxLength={80}
          placeholder="The Grand Pavilion, Chhatarpur"
          {...error('venueName')}
        />
        <Input
          label="Town and state"
          name="venueCity"
          defaultValue={initial.venueCity}
          maxLength={80}
          placeholder="New Delhi, Delhi"
          {...error('venueCity')}
        />
      </div>
      <Input
        label="Google Maps link"
        name="venueMapsUrl"
        type="url"
        inputMode="url"
        defaultValue={initial.venueMapsUrl}
        hint="In Google Maps, open the venue, tap Share and paste the link here."
        {...error('venueMapsUrl')}
      />

      {state.status === 'error' && <Alert tone="danger" title={state.message} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="secondary" block disabled={pending} onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" block disabled={pending}>
          {pending ? 'Saving' : 'Save details'}
        </Button>
      </div>
    </form>
  );
}
