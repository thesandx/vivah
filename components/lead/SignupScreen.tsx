'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { BrandMark } from '@/components/layout/BrandMark';
import { LeadForm } from '@/components/lead/LeadForm';
import { cn } from '@/lib/utils';

/**
 * The sign-up form on its own screen, for a visitor who comes from an ad or
 * a bio link (`vivah.online/#details`). Nothing else competes with it: a
 * plum band says what they get, and the five steps fill the rest.
 *
 * On a phone it covers the whole screen, like an app. The band scrolls away
 * with the form, so the fields keep the room when the keyboard is up, and
 * each step's button stays pinned at the bottom. From `lg` it is a wide
 * sheet with the band as a column on the left and the form on the right.
 *
 * There is no close button: the product owner wants nothing that leads away
 * from the form. From step 2 a back arrow sits top left in the band. It is
 * the native `<dialog>`, as `Dialog` is, so focus stays inside and Escape
 * still closes it. It is not `Dialog`, because that is a bottom sheet with
 * its own title row; this one brings its own band.
 *
 * `SignupDialogProvider` owns the state: it opens this when the address ends
 * in `#details`, and it closes it when the hash goes.
 */

/** The id of this card's heading. The hero card uses `start`. */
const SCREEN_HEADING_ID = 'signup-screen-heading';

const PROMISES = [
  'Each guest sees their own name',
  'Your own address, like priya-rahul.vivah.online',
  'Free preview, pay only when you love it',
];

export interface SignupScreenProps {
  open: boolean;
  /** Called on Escape. */
  onClose: () => void;
}

export function SignupScreen({ open, onClose }: SignupScreenProps): React.JSX.Element {
  const ref = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  /** Where the form's back arrow goes. State, not a ref, so the form renders once it exists. */
  const [backSlot, setBackSlot] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // The first focus lands on the title, so a screen reader hears it.
      title.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Keep `open` the single source of truth: the parent closes it.
        event.preventDefault();
        onClose();
      }}
      className={cn(
        'bg-paper text-ink m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain p-0',
        'backdrop:bg-ink/40',
        'lg:border-line lg:rounded-sheet lg:shadow-hard-lg lg:m-auto lg:h-[min(46rem,92dvh)] lg:max-w-4xl lg:overflow-hidden lg:border-2',
        'sheet-motion',
      )}
    >
      <div className="flex min-h-full flex-col lg:grid lg:h-full lg:grid-cols-5">
        <header className="bg-ink text-paper border-butter max-lg:rounded-b-sheet flex flex-col gap-4 border-b-2 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-6 sm:px-8 lg:col-span-2 lg:border-b-0 lg:p-8">
          <div className="flex items-center gap-3">
            {/* From step 2 the form puts its back arrow here, top left. */}
            <div ref={setBackSlot} className="empty:hidden" />
            <p className="font-display flex items-center gap-2">
              <span className="bg-paper grid size-10 place-items-center rounded-full">
                <BrandMark className="size-8" />
              </span>
              <span className="text-heading font-semibold">vivah.online</span>
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:mt-6">
            <h2
              id={titleId}
              ref={title}
              tabIndex={-1}
              className="text-title font-display outline-none"
            >
              Make your wedding website
            </h2>
            <p className="text-butter text-small">
              A few quick steps, about two minutes. See it free first.
            </p>
          </div>
          <ul className="text-small hidden flex-col gap-3 lg:mt-auto lg:flex">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-center gap-3">
                <svg viewBox="0 0 20 20" aria-hidden="true" className="size-5 shrink-0">
                  <circle cx="10" cy="10" r="10" className="fill-butter" />
                  <path
                    d="m6 10.5 2.6 2.5L14 7.5"
                    className="stroke-ink fill-none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {promise}
              </li>
            ))}
          </ul>
        </header>

        <div className="flex flex-1 flex-col px-5 pt-6 sm:px-8 lg:col-span-3 lg:overflow-y-auto lg:pt-8">
          <LeadForm
            headingId={SCREEN_HEADING_ID}
            place="details"
            layout="screen"
            backSlot={backSlot}
            className="mx-auto max-w-md"
          />
        </div>
      </div>
    </dialog>
  );
}
