'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { whatsAppShareUrl } from '@/lib/business';
import { cn } from '@/lib/utils';

/**
 * The couple's guest links: type a guest's name, get their own link, then
 * copy it or send it on WhatsApp. Each link can be deleted, after a
 * confirmation. `/admin` passes `rename` too, so the admin can fix a name
 * on the couple's behalf.
 *
 * A Client Component for the clipboard, the dialog and the pending states.
 * The writes run on the server, through the Server Actions the page passes
 * in, which check the session and the ownership again.
 */

export type CreateLinkState =
  | { status: 'idle' }
  | { status: 'created'; name: string; segment: string }
  | { status: 'error'; message: string };

export type DeleteLinkResult = { ok: true } | { ok: false; message: string };

/** `name` is the greeting the new link shows. */
export type RenameLinkResult = { ok: true; name: string } | { ok: false; message: string };

export interface GuestLinkItem {
  id: string;
  /** The greeting: `Rahul Sharma`. */
  name: string;
  /** The full link: `https://radha-shyam.vivah.online/Rahul-Sharma`. */
  url: string;
}

export interface GuestLinksProps {
  links: readonly GuestLinkItem[];
  /** `Radha & Shyam`, for the WhatsApp message. */
  coupleNames: string;
  /** The Server Action that makes a link, already bound to this wedding. */
  create: (state: CreateLinkState, form: FormData) => Promise<CreateLinkState>;
  /** The Server Action that deletes a link, already bound to this wedding. */
  remove: (linkId: string) => Promise<DeleteLinkResult>;
  /**
   * The Server Action that gives a link a new name, already bound to this
   * wedding. Without it, the rows show no Edit button.
   */
  rename?: (linkId: string, name: string) => Promise<RenameLinkResult>;
  className?: string;
}

/** The message WhatsApp opens with. The link goes last, so the preview loads. */
export function guestMessage(name: string, coupleNames: string, url: string): string {
  return `Hi ${name}, you are warmly invited to the wedding of ${coupleNames}. Please open your invitation:\n\n${url}`;
}

/** How long "Copied" stays on the button. */
const COPIED_MS = 2000;

function CopyButton({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Button
      variant="secondary"
      aria-label={`Copy ${name}'s link`}
      onClick={() => {
        void navigator.clipboard
          .writeText(url)
          .then(() => {
            setCopied(true);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), COPIED_MS);
          })
          // A browser that refuses the clipboard still shows the link as
          // text in the row, so the couple can copy it by hand.
          .catch(() => setCopied(false));
      }}
    >
      {copied ? 'Copied' : 'Copy link'}
    </Button>
  );
}

function WhatsAppShare({ text, name }: { text: string; name: string }) {
  return (
    <a
      href={whatsAppShareUrl(text)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Send ${name}'s link on WhatsApp`}
      className={buttonStyles({
        variant: 'secondary',
        className: 'bg-whatsapp-deep text-surface border-transparent',
      })}
    >
      <WhatsAppIcon />
      Send on WhatsApp
    </a>
  );
}

export function GuestLinks({
  links,
  coupleNames,
  create,
  remove,
  rename,
  className,
}: GuestLinksProps) {
  const [state, action, pending] = useActionState(create, { status: 'idle' });
  const [confirming, setConfirming] = useState<GuestLinkItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
  const [editing, setEditing] = useState<GuestLinkItem | null>(null);
  const [newName, setNewName] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renamed, setRenamed] = useState<string | null>(null);
  const [renaming, startRename] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the name once its link exists, ready for the next guest.
  useEffect(() => {
    if (state.status === 'created') formRef.current?.reset();
  }, [state]);

  const confirmDelete = () => {
    const link = confirming;
    if (link === null) return;
    startDelete(async () => {
      const result = await remove(link.id);
      setDeleteError(result.ok ? null : result.message);
      setConfirming(null);
    });
  };

  const startEdit = (link: GuestLinkItem) => {
    setEditing(link);
    setNewName(link.name);
    setRenameError(null);
  };

  const confirmRename = () => {
    const link = editing;
    if (link === null || rename === undefined) return;
    startRename(async () => {
      const result = await rename(link.id, newName);
      if (result.ok) {
        setRenamed(result.name);
        setEditing(null);
      } else {
        setRenameError(result.message);
      }
    });
  };

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <form ref={formRef} action={action} className="flex flex-col gap-3" noValidate>
        <Input
          label="Guest's name"
          name="guestName"
          required
          maxLength={40}
          autoComplete="off"
          placeholder="Rahul Sharma"
          hint="Each guest gets their own link that greets them by name."
          {...(state.status === 'error' && { error: state.message })}
        />
        <Button type="submit" variant="primary" block disabled={pending}>
          {pending ? 'Making link' : 'Make link'}
        </Button>
      </form>

      {state.status === 'created' && (
        <Alert tone="success" title={`${state.name}'s link is ready.`}>
          Copy it, or send it on WhatsApp below.
        </Alert>
      )}
      {renamed !== null && (
        <Alert tone="success" title={`Saved. The new link greets ${renamed}.`}>
          Send the new link. The old one now opens the invite without a name.
        </Alert>
      )}
      {deleteError !== null && <Alert tone="danger" title={deleteError} />}

      {links.length === 0 ? (
        <p className="text-small text-ink-soft">
          No guest links yet. Make one above, then send it on WhatsApp.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Guest links">
          {links.map((link) => (
            <li
              key={link.id}
              className="border-line rounded-card bg-surface flex flex-col gap-3 border-2 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-display text-body font-semibold break-words">{link.name}</p>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand text-small break-all underline underline-offset-4"
                  >
                    {link.url.replace(/^https?:\/\//, '')}
                  </a>
                </div>
                <div className="flex shrink-0 gap-1">
                  {rename !== undefined && (
                    <Button
                      variant="quiet"
                      aria-label={`Edit ${link.name}'s link`}
                      onClick={() => startEdit(link)}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    variant="quiet"
                    aria-label={`Delete ${link.name}'s link`}
                    onClick={() => setConfirming(link)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <CopyButton url={link.url} name={link.name} />
                <WhatsAppShare
                  text={guestMessage(link.name, coupleNames, link.url)}
                  name={link.name}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={confirming !== null}
        onClose={() => {
          if (!deleting) setConfirming(null);
        }}
        title="Are you sure you want to delete this link?"
        actions={
          <>
            <Button variant="secondary" disabled={deleting} onClick={() => setConfirming(null)}>
              Keep link
            </Button>
            <Button variant="primary" disabled={deleting} onClick={confirmDelete}>
              {deleting ? 'Deleting' : 'Delete link'}
            </Button>
          </>
        }
      >
        <p>
          If {confirming?.name ?? 'this guest'} opens the link, they see the invite without their
          name. You cannot get this link back.
        </p>
      </Dialog>

      {rename !== undefined && (
        <Dialog
          open={editing !== null}
          onClose={() => {
            if (!renaming) setEditing(null);
          }}
          title="Change this guest's name"
          actions={
            <>
              <Button variant="secondary" disabled={renaming} onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button variant="primary" disabled={renaming} onClick={confirmRename}>
                {renaming ? 'Saving' : 'Save name'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <p>
              The name is part of the link, so this makes a new link. The old link opens the invite
              without a name. Send the new one after.
            </p>
            <Input
              label="Guest's name"
              name="newGuestName"
              maxLength={40}
              autoComplete="off"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              {...(renameError !== null && { error: renameError })}
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
