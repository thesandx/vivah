'use client';

import { useState } from 'react';

import { BrandMark } from '@/components/layout/BrandMark';
import { LeadForm } from '@/components/lead/LeadForm';
import { SECTION_ATTRIBUTE } from '@/lib/visit-tracking';

/**
 * The sign-up form as a screen of its own, for a visitor who comes from an
 * ad or a bio link. `app/(lead)/details/page.tsx` renders it, and a
 * `vivah.online/#details` link goes there (`lib/details-link.ts`).
 *
 * On a phone it behaves like an app screen: it fills the screen height and
 * the page itself does not scroll. A slim plum band at the top says what
 * they get, the step fills the middle, and the step's button stays pinned
 * at the bottom, in thumb reach. If a step is taller than a small phone, or
 * the keyboard is up, only the middle scrolls. From `lg` it is a wide sheet
 * in the middle of the page, with the band as a column on the left.
 *
 * There is no close button and no link away: the product owner wants
 * nothing that leads away from the form. From step 2 a back arrow sits top
 * left in the band.
 *
 * A Client Component, because the form's back arrow needs the band's slot.
 */

/** The id of this card's heading. The hero card uses `start`. */
const SCREEN_HEADING_ID = 'signup-screen-heading';

const PROMISES = [
  'Each guest sees their own name',
  'Your own address, like priya-rahul.vivah.online',
  'Free preview, pay only when you love it',
];

export function SignupScreen(): React.JSX.Element {
  /** Where the form's back arrow goes. State, not a ref, so the form renders once it exists. */
  const [backSlot, setBackSlot] = useState<HTMLDivElement | null>(null);

  return (
    <main
      // Counted as the hero in the Visitors tab: it is the sign-up card, and
      // it was the hero section when this screen opened over the home page.
      {...{ [SECTION_ATTRIBUTE]: 'hero' }}
      className="bg-paper text-ink flex h-dvh flex-col overflow-hidden lg:items-center lg:justify-center lg:p-8"
    >
      <div className="flex min-h-0 w-full flex-1 flex-col lg:border-line lg:rounded-sheet lg:shadow-hard-lg lg:grid lg:h-[min(46rem,92dvh)] lg:max-w-4xl lg:flex-none lg:grid-cols-5 lg:overflow-hidden lg:border-2">
        <header className="bg-ink text-paper border-butter max-lg:rounded-b-sheet flex shrink-0 flex-col gap-1 border-b-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-8 lg:col-span-2 lg:gap-4 lg:border-b-0 lg:p-8">
          <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-6">
            <div className="flex items-center gap-3">
              {/* From step 2 the form puts its back arrow here, top left. */}
              <div ref={setBackSlot} className="empty:hidden" />
              <span className="bg-paper short:hidden grid size-9 shrink-0 place-items-center rounded-full lg:size-12">
                <BrandMark className="size-7 lg:size-10" />
              </span>
            </div>
            <div className="flex min-w-0 flex-col lg:gap-2">
              <h1 className="text-heading short:text-body lg:text-title font-display font-semibold">
                Make your wedding website
              </h1>
              <p className="text-butter text-small">About two minutes. See it free first.</p>
            </div>
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

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-4 sm:px-8 lg:col-span-3 lg:pt-8">
          <LeadForm
            headingId={SCREEN_HEADING_ID}
            place="details"
            layout="screen"
            backSlot={backSlot}
            className="mx-auto max-w-md"
          />
        </div>
      </div>
    </main>
  );
}
