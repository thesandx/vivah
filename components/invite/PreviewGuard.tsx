'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Wraps the couple's unpaid preview so it cannot pass for the real invite.
 *
 * - A tiled "vivah.online · preview only" watermark over the whole invite.
 *   It is part of the server HTML, so a screenshot always carries it.
 * - No right-click menu, no text selection, no image drag, and no long-press
 *   "Save image" on iOS.
 * - Ctrl/Cmd + S, P and U are blocked, and a print shows a notice instead of
 *   the invite.
 * - The invite blanks while the window is in the background or loses focus,
 *   so the phone's app switcher and most desktop capture tools see a blank
 *   card.
 *
 * A Client Component for the event handlers and the blank state.
 *
 * None of this stops a determined person: a phone screenshot sends no event
 * to the page. The watermark is the real protection; the rest only removes
 * the easy ways to save a clean copy.
 */

export interface PreviewGuardProps {
  /** The watermark text, e.g. `vivah.online · preview only`. */
  label: string;
  children: React.ReactNode;
  className?: string;
}

/** Keys that save, print or show the page source, with Ctrl or Cmd. */
const BLOCKED_KEYS = new Set(['s', 'p', 'u']);

const ROWS = 34;
const REPEATS = 8;

export function PreviewGuard({ label, children, className }: PreviewGuardProps): React.JSX.Element {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const hide = () => setHidden(true);
    const show = () => setHidden(document.visibilityState !== 'visible');
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && BLOCKED_KEYS.has(event.key.toLowerCase())) {
        event.preventDefault();
      }
      // The key that takes a desktop screenshot on Windows. The capture may
      // already be taken; blanking still spoils the next one.
      if (event.key === 'PrintScreen') hide();
    };

    document.addEventListener('visibilitychange', show);
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('visibilitychange', show);
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const block = (event: React.SyntheticEvent) => event.preventDefault();

  return (
    <div
      onContextMenu={block}
      onDragStart={block}
      onCopy={block}
      // iOS shows "Save image" on a long press unless this is off. There is
      // no Tailwind utility for it.
      style={{ WebkitTouchCallout: 'none' }}
      className={cn('relative isolate select-none', className)}
    >
      <div
        className={cn('print:hidden', hidden && 'invisible')}
        aria-hidden={hidden ? true : undefined}
      >
        {children}
      </div>

      {hidden && (
        <div className="bg-paper absolute inset-0 z-10 flex justify-center p-6 pt-24 print:hidden">
          <p className="text-ink-soft text-center">
            Preview hidden. Come back to this tab to see it.
          </p>
        </div>
      )}

      <p className="text-ink hidden p-8 text-center print:block">
        This is a private preview and cannot be printed. Publish your invite to share it.
      </p>

      {/* The watermark: rows of the label, turned and offset, over everything. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden print:hidden"
      >
        <div className="absolute -inset-1/2 flex -rotate-20 flex-col justify-around">
          {Array.from({ length: ROWS }, (_, row) => (
            <p
              key={row}
              className={cn(
                'text-ink-soft text-body flex gap-12 font-sans font-bold tracking-widest whitespace-nowrap uppercase opacity-30',
                row % 2 === 1 && 'pl-24',
              )}
            >
              {Array.from({ length: REPEATS }, (_, repeat) => (
                <span key={repeat}>{label}</span>
              ))}
            </p>
          ))}
        </div>
      </div>

      <p className="sr-only">This is a preview. It carries a watermark until you publish.</p>
    </div>
  );
}
