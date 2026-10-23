'use client';

import { useEffect, useState } from 'react';

import { SignupButton } from '@/components/lead/SignupButton';
import { useSignupDialog } from '@/hooks/useSignupDialog';
import { cn } from '@/lib/utils';

/**
 * A bar at the bottom of the home page that keeps the sign-up one tap away.
 * It rises in once the visitor scrolls past the hero's sign-up card, and sinks
 * away when they scroll back up to it, so the page never shows two forms.
 * It also hides while the sign-up dialog is open.
 *
 * On a phone it stops short of the floating WhatsApp button on the right, so
 * both stay tappable. From `md` it is a centred pill.
 *
 * An IntersectionObserver watches the card, so nothing runs on scroll.
 */
export interface StickySignupBarProps {
  /** The id of the element the bar waits for the visitor to scroll past. */
  afterId: string;
  /** The line beside the button, from `sm` up. */
  line: string;
  /** The button label. */
  action: string;
}

export function StickySignupBar({ afterId, line, action }: StickySignupBarProps) {
  const { isActive } = useSignupDialog();
  const [past, setPast] = useState(false);

  useEffect(() => {
    const target = document.getElementById(afterId);
    // An old browser without the observer never shows the bar; the section
    // buttons still open the dialog.
    if (target === null || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry === undefined) return;
      // Past means above the screen, not below it: the bar must not show on a
      // page that loads scrolled to the top on a short screen.
      setPast(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [afterId]);

  const shown = past && !isActive;

  return (
    <div
      inert={!shown}
      data-shown={shown}
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 flex justify-center pr-22 pl-4 md:bottom-6 md:px-24',
        'ease-settle transition duration-300',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
      )}
    >
      <div className="bg-surface border-line rounded-pill shadow-hard-lg pointer-events-auto flex w-full max-w-xl items-center gap-4 border-2 p-1 sm:pl-6">
        <p className="text-ink hidden flex-1 font-semibold sm:block">{line}</p>
        <SignupButton size="md" className="w-full sm:w-auto" data-track-cta="sticky-bar">
          {action}
        </SignupButton>
      </div>
    </div>
  );
}
