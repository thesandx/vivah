'use client';

import { useActionState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

/**
 * The dashboard form for a couple's invite details: names, day, time and
 * venue. A Client Component only for the pending state and the field errors;
 * the save runs on the server, through the Server Action the page passes in,
 * which checks the session and the ownership again.
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
  className?: string;
}

export function WeddingDetailsForm({
  initial,
  save,
  inviteHref,
  className,
}: WeddingDetailsFormProps): React.JSX.Element {
  const [state, action, pending] = useActionState(save, { status: 'idle' });
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
          required
          maxLength={60}
          {...error('bride')}
        />
        <Input
          label="Groom's name"
          name="groom"
          defaultValue={initial.groom}
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
          placeholder="Laxmisagar"
          {...error('venueName')}
        />
        <Input
          label="Town and state"
          name="venueCity"
          defaultValue={initial.venueCity}
          maxLength={80}
          placeholder="Darbhanga, Bihar"
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

      {state.status === 'saved' && (
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
      )}
      {state.status === 'error' && <Alert tone="danger" title={state.message} />}

      <Button type="submit" variant="primary" block disabled={pending}>
        {pending ? 'Saving' : 'Save details'}
      </Button>
    </form>
  );
}
