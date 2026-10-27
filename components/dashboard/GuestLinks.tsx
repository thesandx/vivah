'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useTransition } from 'react';

import { Alert } from '@/components/ui/Alert';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon';
import { whatsAppShareUrl } from '@/lib/business';
import { LINK_PREVIEW_FAQ_ID } from '@/lib/seo';
import { cn } from '@/lib/utils';

/**
 * The couple's guest links: type a guest's name, get their own link, then
 * copy it or send it on WhatsApp. Each link can be deleted, after a
 * confirmation.
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

export function GuestLinks({ links, coupleNames, create, remove, className }: GuestLinksProps) {
  const [state, action, pending] = useActionState(create, { status: 'idle' });
  const [confirming, setConfirming] = useState<GuestLinkItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();
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
                <Button
                  variant="quiet"
                  className="shrink-0"
                  aria-label={`Delete ${link.name}'s link`}
                  onClick={() => setConfirming(link)}
                >
                  Delete
                </Button>
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

      {links.length > 0 && (
        <p className="text-small text-ink-soft">
          <span className="text-ink font-semibold">Tip:</span> in WhatsApp, wait about 2 seconds
          before you tap send. This gives the invite preview time to load, so your guest sees your
          card, not only a link.{' '}
          <Link
            href={`/help#${LINK_PREVIEW_FAQ_ID}`}
            className="text-brand underline underline-offset-4"
          >
            Preview not showing?
          </Link>
        </p>
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
          If {confirming?.name ?? 'this guest'} opens the link, they see your invite without their
          name. You cannot get this link back.
        </p>
      </Dialog>
    </div>
  );
}
