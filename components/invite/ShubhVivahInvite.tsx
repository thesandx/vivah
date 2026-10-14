import { cn } from '@/lib/utils';
import { formatWeddingDate } from '@/lib/wedding-date';

/**
 * The couple's invite in the Shubh Vivah theme: ivory card stock, a gold
 * border with corner ornaments, the names in script. A Server Component.
 *
 * Colours come from the `shubh-vivah` theme tokens (`styles/globals.css`),
 * which `app/(invite)/site/[slug]/layout.tsx` applies. `brand` is maroon,
 * `butter` is gold, `peach` is marigold. Religion-neutral by default: no
 * deity motif, per the PRD's design principles.
 */

export interface ShubhVivahInviteProps {
  bride: string;
  groom: string;
  /** `YYYY-MM-DD`, or `null` when the couple has not added it yet. */
  weddingDate: string | null;
  /** The guest this link was made for, or `null` for the plain link. */
  guestName: string | null;
  className?: string;
}

/** A corner ornament: a quarter mandala of petals and arcs, in gold. */
function Corner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={cn('text-butter pointer-events-none absolute size-14', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M4 60V20A16 16 0 0 1 20 4h40" />
      <path d="M10 60V24A14 14 0 0 1 24 10h36" />
      <circle cx="14" cy="14" r="4" className="fill-peach" stroke="none" />
      <path d="M22 22c6-10 16-12 26-10-6 4-10 10-12 18-4-6-8-8-14-8Z" />
      <path d="M22 22c-10 6-12 16-10 26 4-6 10-10 18-12-6-4-8-8-8-14Z" />
    </svg>
  );
}

/** A row of marigold dots between gold rules: the section divider. */
function Divider() {
  return (
    <div aria-hidden="true" className="flex items-center gap-2">
      <span className="bg-butter h-0.5 w-12 rounded-pill" />
      <span className="bg-peach size-2 rounded-full" />
      <span className="bg-brand-soft size-2.5 rounded-full" />
      <span className="bg-peach size-2 rounded-full" />
      <span className="bg-butter h-0.5 w-12 rounded-pill" />
    </div>
  );
}

export function ShubhVivahInvite({
  bride,
  groom,
  weddingDate,
  guestName,
  className,
}: ShubhVivahInviteProps) {
  return (
    <article
      className={cn(
        'border-butter bg-surface shadow-mochi relative mx-auto flex w-full max-w-md flex-col items-center gap-5 rounded-card border-2 px-6 py-14 text-center',
        className,
      )}
    >
      <Corner className="top-2 left-2" />
      <Corner className="top-2 right-2 -scale-x-100" />
      <Corner className="bottom-2 left-2 -scale-y-100" />
      <Corner className="right-2 bottom-2 -scale-100" />

      <p className="font-display text-heading text-ink-soft italic">Shubh Vivah</p>
      <Divider />

      {guestName !== null && <p className="font-script text-title text-brand">Dear {guestName},</p>}
      <p className="text-ink-soft max-w-xs">
        Together with their families, we joyfully invite you to the wedding of
      </p>

      <h1 className="flex flex-col items-center gap-1">
        <span className="font-script text-hero text-brand">{bride}</span>
        <span className="font-display text-heading text-ink-soft">and</span>
        <span className="font-script text-hero text-brand">{groom}</span>
      </h1>

      <Divider />
      <p className="font-display text-title">
        {weddingDate === null ? 'The date will be shared soon' : formatWeddingDate(weddingDate)}
      </p>
      <p className="text-small text-ink-soft">Your presence is our blessing.</p>
    </article>
  );
}
