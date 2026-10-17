'use client';

import { useActionState, useRef, useState } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button, type ButtonVariant } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { isStalePageError, STALE_PAGE_MESSAGE } from '@/lib/action-errors';
import { cn } from '@/lib/utils';

/**
 * One admin action: a button, optionally one text field, optionally a
 * confirmation step, and the result in words under it.
 *
 * The work runs on the server, in the Server Action the page passes in,
 * which checks the admin session again. `'use client'` only for the pending
 * state, the dialog and the result message.
 */

export type ActionState =
  { status: 'idle' } | { status: 'ok'; message: string } | { status: 'error'; message: string };

export interface AdminActionFormProps {
  /** The Server Action, already bound to its record. */
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  label: string;
  variant?: ButtonVariant;
  /** One text field to send with the action, such as a new address. */
  field?: {
    name: string;
    label: string;
    defaultValue?: string;
    hint?: string;
    prefix?: string;
    inputMode?: 'text' | 'tel';
  };
  /** Ask before acting. For anything a guest would notice. */
  confirm?: { title: string; body: string; confirmLabel: string };
  className?: string;
}

export function AdminActionForm({
  action,
  label,
  variant = 'secondary',
  field,
  confirm,
  className,
}: AdminActionFormProps): React.JSX.Element {
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, form: FormData): Promise<ActionState> => {
      try {
        return await action(previous, form);
      } catch (error) {
        // A page opened before a deploy calls an action the server no longer has.
        if (isStalePageError(error)) {
          return { status: 'error', message: STALE_PAGE_MESSAGE };
        }
        throw error;
      }
    },
    { status: 'idle' },
  );
  const [asking, setAsking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} className={cn('flex flex-col gap-3', className)}>
      {field !== undefined && (
        <Input
          label={field.label}
          name={field.name}
          defaultValue={field.defaultValue ?? ''}
          {...(field.hint !== undefined && { hint: field.hint })}
          {...(field.prefix !== undefined && { prefix: field.prefix })}
          inputMode={field.inputMode ?? 'text'}
          autoComplete="off"
          required
        />
      )}

      <Button
        type={confirm === undefined ? 'submit' : 'button'}
        variant={variant}
        disabled={pending}
        onClick={confirm === undefined ? undefined : () => setAsking(true)}
        className="sm:self-start"
      >
        {pending ? 'Working…' : label}
      </Button>

      {confirm !== undefined && (
        <Dialog
          open={asking}
          onClose={() => setAsking(false)}
          title={confirm.title}
          actions={
            <>
              <Button variant="secondary" onClick={() => setAsking(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setAsking(false);
                  formRef.current?.requestSubmit();
                }}
              >
                {confirm.confirmLabel}
              </Button>
            </>
          }
        >
          <p className="text-ink-soft">{confirm.body}</p>
        </Dialog>
      )}

      {state.status !== 'idle' && (
        <Alert tone={state.status === 'ok' ? 'success' : 'danger'} title={state.message} />
      )}
    </form>
  );
}
